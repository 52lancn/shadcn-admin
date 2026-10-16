package demo

import (
	"context"
	"math"
	"strconv"

	"admin-server/internal/model"
	"admin-server/internal/svc"
	"admin-server/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

// ChartLogic builds every dataset consumed by the report/dashboard demos.
type ChartLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewChartLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ChartLogic {
	return &ChartLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

// Overview returns trend / category / region / channel / funnel / radar / heatmap in one shot.
func (l *ChartLogic) Overview(days int) (*types.ChartOverviewVO, error) {
	if days <= 0 || days > 365 {
		days = 30
	}
	conn := l.svcCtx.DB

	// ---- trend ----
	trendRows, err := model.ChartTrend(l.ctx, conn, days)
	if err != nil {
		return nil, err
	}
	trend := make([]types.TrendPoint, 0, len(trendRows))
	for _, r := range trendRows {
		trend = append(trend, types.TrendPoint{Date: r.D, Amount: round2(r.Amount), Orders: r.Orders})
	}

	// ---- grouped dimensions ----
	category, err := groupToNameValue(l.ctx, conn, "category")
	if err != nil {
		return nil, err
	}
	region, err := groupToNameValue(l.ctx, conn, "region")
	if err != nil {
		return nil, err
	}
	channel, err := groupToNameValue(l.ctx, conn, "channel")
	if err != nil {
		return nil, err
	}

	// ---- summary cards ----
	summary, err := model.ChartSummary(l.ctx, conn)
	if err != nil {
		return nil, err
	}
	avg := 0.0
	if summary.Orders > 0 {
		avg = summary.Amount / summary.Orders
	}
	summaryCards := []types.NameValue{
		{Name: "累计销售额", Value: round2(summary.Amount)},
		{Name: "累计订单量", Value: summary.Orders},
		{Name: "客单价", Value: round2(avg)},
		{Name: "覆盖天数", Value: float64(len(trend))},
	}

	// ---- funnel: derived from real order volume ----
	funnel := buildFunnel(summary.Orders)

	// ---- radar: per-category share normalised to 0-100 ----
	radar := buildRadar(category)

	// ---- heatmap: weekday x hour ----
	heatRows, err := model.ChartHeatmap(l.ctx, conn)
	if err != nil {
		return nil, err
	}
	heatmap := make([]types.HeatPoint, 0, len(heatRows))
	dayNames := []string{"", "周日", "周一", "周二", "周三", "周四", "周五", "周六"}
	for _, r := range heatRows {
		day := strconv.Itoa(r.Dow)
		if r.Dow >= 0 && r.Dow < len(dayNames) && dayNames[r.Dow] != "" {
			day = dayNames[r.Dow]
		}
		heatmap = append(heatmap, types.HeatPoint{Hour: r.Hr, Day: day, Value: round2(r.Value)})
	}

	return &types.ChartOverviewVO{
		Summary:  summaryCards,
		Trend:    trend,
		Category: category,
		Region:   region,
		Channel:  channel,
		Funnel:   funnel,
		Radar:    radar,
		Heatmap:  heatmap,
	}, nil
}

func groupToNameValue(ctx context.Context, conn sqlx.SqlConn, column string) ([]types.NameValue, error) {
	rows, err := model.ChartGroupBy(ctx, conn, column)
	if err != nil {
		return nil, err
	}
	out := make([]types.NameValue, 0, len(rows))
	for _, r := range rows {
		out = append(out, types.NameValue{Name: r.Name, Value: round2(r.Value)})
	}
	return out, nil
}

// buildFunnel converts order volume into a classic e-commerce conversion funnel.
func buildFunnel(orders float64) []types.NameValue {
	base := orders
	if base <= 0 {
		base = 1000
	}
	return []types.NameValue{
		{Name: "曝光", Value: round2(base * 42)},
		{Name: "点击", Value: round2(base * 18)},
		{Name: "加购", Value: round2(base * 6.4)},
		{Name: "下单", Value: round2(base * 2.1)},
		{Name: "支付", Value: round2(base)},
	}
}

// buildRadar normalises category revenue into a 0-100 score set.
func buildRadar(categories []types.NameValue) types.RadarData {
	indicators := make([]string, 0, len(categories))
	series := make([]types.NameValue, 0, len(categories))
	max := 0.0
	for _, c := range categories {
		if c.Value > max {
			max = c.Value
		}
	}
	if max <= 0 {
		max = 1
	}
	for _, c := range categories {
		indicators = append(indicators, c.Name)
		series = append(series, types.NameValue{Name: c.Name, Value: round2(c.Value / max * 100)})
	}
	return types.RadarData{Indicators: indicators, Series: series}
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
