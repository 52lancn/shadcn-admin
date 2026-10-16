package demo

import (
	"context"
	"math"
	"math/rand"
	"sync"
	"time"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

// MonitorLogic produces the big-screen monitoring snapshot.
// Infra metrics are simulated with a bounded random walk so the screen "breathes"
// while the business numbers (orders / amount / regions) come from real tables.
type MonitorLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewMonitorLogic(ctx context.Context, svcCtx *svc.ServiceContext) *MonitorLogic {
	return &MonitorLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

const seriesLen = 30

type metricSpec struct {
	key   string
	label string
	unit  string
	max   float64
	base  float64
	jitter float64
}

var metricSpecs = []metricSpec{
	{key: "cpu", label: "CPU 使用率", unit: "%", max: 100, base: 46, jitter: 6},
	{key: "mem", label: "内存使用率", unit: "%", max: 100, base: 63, jitter: 4},
	{key: "disk", label: "磁盘使用率", unit: "%", max: 100, base: 58, jitter: 1.2},
	{key: "net", label: "网络吞吐", unit: "MB/s", max: 1000, base: 268, jitter: 42},
	{key: "gpu", label: "GPU 负载", unit: "%", max: 100, base: 37, jitter: 8},
	{key: "conn", label: "活跃连接", unit: "K", max: 200, base: 82, jitter: 9},
}

var serviceNames = []string{"API 网关", "用户服务", "订单服务", "支付服务", "消息队列", "缓存集群"}

var alertTemplates = []struct {
	level  string
	title  string
	source string
}{
	{"danger", "数据库连接池使用率超过 90%", "db-monitor"},
	{"warn", "订单服务 P99 延迟上升至 820ms", "order-service"},
	{"info", "缓存集群节点 C3 完成自动恢复", "redis-cluster"},
	{"warn", "支付回调失败率 2.3%，高于阈值", "payment-service"},
	{"info", "定时备份任务执行成功", "scheduler"},
	{"danger", "对象存储空间剩余不足 10%", "oss"},
	{"warn", "API 网关 QPS 达到限流阈值 80%", "api-gateway"},
	{"info", "灰度批次 v2.4.1 发布完成", "deploy"},
}

var (
	monMu     sync.Mutex
	monState  = map[string]float64{}
	qpsSeries []types.TimeValue
	traffic   []types.TimeValue
	alerts    []types.AlertItem
	alertSeq  int64
	services  []types.ServiceStatus
)

func init() {
	now := time.Now()
	for _, s := range metricSpecs {
		monState[s.key] = s.base
	}
	for i := 0; i < seriesLen; i++ {
		t := now.Add(time.Duration(-(seriesLen - 1 - i)) * 3 * time.Second)
		qpsSeries = append(qpsSeries, types.TimeValue{Time: t.Format("15:04:05"), Value: jitter(5200, 900)})
		traffic = append(traffic, types.TimeValue{Time: t.Format("15:04:05"), Value: jitter(260, 60)})
	}
	for _, n := range serviceNames {
		services = append(services, types.ServiceStatus{Name: n, Status: "healthy", Latency: jitter(48, 22), Uptime: 99.9})
	}
	for i := 0; i < 5; i++ {
		alertSeq++
		tpl := alertTemplates[i%len(alertTemplates)]
		alerts = append(alerts, types.AlertItem{
			ID:     alertSeq,
			Level:  tpl.level,
			Title:  tpl.title,
			Source: tpl.source,
			Time:   now.Add(time.Duration(-i) * 7 * time.Minute).Format("15:04"),
		})
	}
}

func jitter(base, amp float64) float64 {
	v := base + (rand.Float64()*2-1)*amp
	return math.Round(v*100) / 100
}

// clampWalk moves a value by a bounded random step, keeping it inside [min, max].
func clampWalk(cur, base, jitterAmp, max, min float64) float64 {
	step := (rand.Float64()*2 - 1) * jitterAmp
	next := cur + step
	// pull back toward the base so the walk never drifts away
	next += (base - next) * 0.12
	if next < min {
		next = min
	}
	if next > max {
		next = max
	}
	return math.Round(next*100) / 100
}

func levelOf(v, max float64) string {
	r := v / max
	switch {
	case r >= 0.85:
		return "danger"
	case r >= 0.7:
		return "warn"
	default:
		return "ok"
	}
}

// Snapshot advances the simulated state by one tick and returns the full payload.
func (l *MonitorLogic) Snapshot() (*types.MonitorSnapshotVO, error) {
	monMu.Lock()
	defer monMu.Unlock()

	now := time.Now()
	conn := l.svcCtx.DB

	// --- infra metrics ---
	metrics := make([]types.MonitorMetric, 0, len(metricSpecs))
	for _, s := range metricSpecs {
		prev := monState[s.key]
		next := clampWalk(prev, s.base, s.jitter, s.max, s.max*0.03)
		monState[s.key] = next
		metrics = append(metrics, types.MonitorMetric{
			Key:   s.key,
			Label: s.label,
			Value: next,
			Unit:  s.unit,
			Max:   s.max,
			Trend: math.Round((next-prev)*100) / 100,
			Level: levelOf(next, s.max),
		})
	}

	// --- rolling series ---
	qpsSeries = append(qpsSeries[1:], types.TimeValue{Time: now.Format("15:04:05"), Value: clampWalk(qpsSeries[len(qpsSeries)-1].Value, 5200, 700, 12000, 1200)})
	traffic = append(traffic[1:], types.TimeValue{Time: now.Format("15:04:05"), Value: clampWalk(traffic[len(traffic)-1].Value, 260, 55, 1000, 20)})

	// --- services ---
	for i := range services {
		services[i].Latency = clampWalk(services[i].Latency, 48, 14, 900, 5)
		switch {
		case services[i].Latency > 300:
			services[i].Status = "down"
		case services[i].Latency > 150:
			services[i].Status = "degraded"
		default:
			services[i].Status = "healthy"
		}
		services[i].Uptime = math.Round((99.99 - rand.Float64()*0.35) * 100) / 100
	}

	// --- alerts: occasionally push a new one ---
	if rand.Float64() < 0.35 && len(alerts) > 0 {
		alertSeq++
		tpl := alertTemplates[rand.Intn(len(alertTemplates))]
		alerts = append([]types.AlertItem{{
			ID:     alertSeq,
			Level:  tpl.level,
			Title:  tpl.title,
			Source: tpl.source,
			Time:   now.Format("15:04"),
		}}, alerts...)
		if len(alerts) > 12 {
			alerts = alerts[:12]
		}
	}

	// --- real business numbers ---
	today, _ := model.ChartToday(l.ctx, conn)
	online := 18000 + rand.Int63n(2600)
	conversion := math.Round((3.2+rand.Float64()*2.6)*100) / 100

	regions := make([]types.NameValue, 0)
	if rows, err := model.ChartGroupBy(l.ctx, conn, "region"); err == nil {
		for _, r := range rows {
			regions = append(regions, types.NameValue{Name: r.Name, Value: round2(r.Value)})
		}
	}
	if len(regions) == 0 {
		regions = []types.NameValue{
			{Name: "华东", Value: 128000}, {Name: "华南", Value: 96000},
			{Name: "华北", Value: 88000}, {Name: "西南", Value: 52000},
			{Name: "东北", Value: 31000}, {Name: "西北", Value: 24000},
		}
	}

	return &types.MonitorSnapshotVO{
		Timestamp:   now.UnixMilli(),
		Metrics:     metrics,
		QPS:         append([]types.TimeValue{}, qpsSeries...),
		Traffic:     append([]types.TimeValue{}, traffic...),
		OnlineUsers: online,
		TodayOrders: int64(today.Orders),
		TodayAmount: round2(today.Amount),
		Conversion:  conversion,
		Regions:     regions,
		Alerts:      append([]types.AlertItem{}, alerts...),
		Services:    append([]types.ServiceStatus{}, services...),
	}, nil
}
