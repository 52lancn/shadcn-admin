-- ============================================================
-- AI 智能内容与运营模块
--   ai_chat_record  生成记录（内容生成/润色/扩写/续写/翻译/情感分析）
--   ai_feedback     舆情语料（用户评论/反馈），供情感分析与预警使用
--   ai_prompt_preset 提示词模板（前端一键套用的场景模板）
-- Safe to re-run: all statements are idempotent.
-- ============================================================

-- ---------- 生成记录 ----------
CREATE TABLE IF NOT EXISTS ai_chat_record (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  task          VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '任务类型 generate/polish/expand/continue/translate/sentiment',
  scene         VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '场景 product/email/news/general',
  model         VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '模型标识',
  vendor        VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '实际服务的厂商',
  prompt_tokens INT NOT NULL DEFAULT 0 COMMENT '输入 tokens',
  completion_tokens INT NOT NULL DEFAULT 0 COMMENT '输出 tokens',
  total_tokens  INT NOT NULL DEFAULT 0 COMMENT '总 tokens',
  elapsed       INT NOT NULL DEFAULT 0 COMMENT '耗时毫秒',
  mocked        TINYINT NOT NULL DEFAULT 0 COMMENT '1=本地兜底引擎 0=真实模型',
  input         TEXT COMMENT '输入内容',
  output        MEDIUMTEXT COMMENT '输出内容',
  user_id       BIGINT NOT NULL DEFAULT 0 COMMENT '操作人',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_task (task),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 生成记录';

-- ---------- 舆情语料 ----------
CREATE TABLE IF NOT EXISTS ai_feedback (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  content      TEXT NOT NULL COMMENT '评论/反馈正文',
  source       VARCHAR(32) NOT NULL DEFAULT '商城评论' COMMENT '来源渠道',
  author       VARCHAR(64) NOT NULL DEFAULT '' COMMENT '用户昵称',
  rating       TINYINT NOT NULL DEFAULT 5 COMMENT '评分 1-5',
  product      VARCHAR(128) NOT NULL DEFAULT '' COMMENT '关联商品',
  -- 以下字段由情感分析回填
  sentiment    VARCHAR(16) NOT NULL DEFAULT '' COMMENT 'positive/negative/neutral',
  score        DECIMAL(4,3) NOT NULL DEFAULT 0 COMMENT '情感得分 -1~1',
  confidence   DECIMAL(4,3) NOT NULL DEFAULT 0 COMMENT '置信度 0~1',
  risk_level   VARCHAR(16) NOT NULL DEFAULT '' COMMENT 'low/medium/high',
  tags         VARCHAR(255) NOT NULL DEFAULT '' COMMENT '标签，逗号分隔',
  summary      VARCHAR(512) NOT NULL DEFAULT '' COMMENT '分析摘要',
  suggestion   VARCHAR(512) NOT NULL DEFAULT '' COMMENT '处理建议',
  handled      TINYINT NOT NULL DEFAULT 0 COMMENT '1=已处理',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  analyzed_at  DATETIME NULL COMMENT '分析时间',
  KEY idx_sentiment (sentiment),
  KEY idx_risk (risk_level),
  KEY idx_handled (handled),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 舆情语料';

-- ---------- 提示词模板 ----------
CREATE TABLE IF NOT EXISTS ai_prompt_preset (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(64) NOT NULL COMMENT '模板名',
  scene       VARCHAR(32) NOT NULL DEFAULT 'general' COMMENT '场景 product/email/news/general',
  template    TEXT NOT NULL COMMENT '模板正文，{{var}} 为占位符',
  sort        INT NOT NULL DEFAULT 0,
  status      TINYINT NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_scene (scene)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 提示词模板';

-- ============================================================
-- 菜单挂载（挂在「业务示例」之后，与其他一级菜单同级）
-- 幂等：ON DUPLICATE KEY 保证重复执行不会产生重复菜单。
-- ============================================================
INSERT INTO sys_menu (id, parent_id, name, path, component, icon, type, perms, sort, visible, status) VALUES
  (100, 0, 'AI 智能中心', '/ai', '', 'Sparkles', 1, '', 60, 1, 1),
  (101, 100, '内容生成', '/ai/content', 'ai/ContentStudio/index', 'Wand2', 2, '', 1, 1, 1),
  (102, 100, '智能翻译', '/ai/translate', 'ai/Translate/index', 'Languages', 2, '', 2, 1, 1),
  (103, 100, '舆情情感', '/ai/sentiment', 'ai/Sentiment/index', 'Radar', 2, '', 3, 1, 1),
  (104, 100, 'AI 用量', '/ai/usage', 'ai/Usage/index', 'Activity', 2, '', 4, 1, 1)
ON DUPLICATE KEY UPDATE name = name, path = VALUES(path), component = VALUES(component), icon = VALUES(icon);

-- super admin role gets every menu
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 1, id FROM sys_menu WHERE id BETWEEN 100 AND 104
ON DUPLICATE KEY UPDATE role_id = role_id;


-- ---------- 提示词模板 ----------
INSERT INTO ai_prompt_preset (name, scene, template, sort, status) VALUES
  ('小红书种草文案', 'product',
   '为「{{product}}」写一篇小红书风格的种草笔记，语气真实、有个人体验、不要广告腔，300 字以内。', 1, 1),
  ('电商详情页卖点', 'product',
   '为「{{product}}」提炼 5 条电商详情页卖点，每条一行，突出差异化，避免空洞形容词。', 2, 1),
  ('促销营销邮件', 'email',
   '写一封「{{product}}」大促营销邮件，主题行包含折扣数字，正文不超过 300 字，只保留一个行动号召。', 3, 1),
  ('用户召回邮件', 'email',
   '针对沉睡用户写一封召回邮件，以「{{benefit}}」为切入点，语气真诚不强推，200 字以内。', 4, 1),
  ('产品发布公告', 'news',
   '以「{{product}}」为主题写一篇产品发布公告，包含导语、核心内容、影响面三部分，语言客观。', 5, 1),
  ('服务升级公告', 'news',
   '写一篇服务升级公告，说明升级内容、对用户的影响、以及遇到问题时的联系方式。', 6, 1),
  ('通用润色', 'polish',
   '润色以下文本：保留原意与关键数据，去掉冗余表达，使语言更简洁专业。\n\n{{content}}', 7, 1),
  ('通用扩写', 'expand',
   '扩写以下文本，补充场景与细节，但不得新增原文没有的事实：\n\n{{content}}', 8, 1),
  ('通用续写', 'continue',
   '承接以下内容继续写下去，保持语气一致，约 200 字：\n\n{{content}}', 9, 1)
ON DUPLICATE KEY UPDATE name = name;

-- ---------- 舆情语料（覆盖正向/中性/负向/高危四档） ----------
-- 先清掉上一次由本脚本写入的种子行（按种子作者名单精确匹配，不影响用户自己录入的评论），
-- 保证脚本可重复执行而不会产生重复语料。
DELETE FROM ai_feedback WHERE author IN (
  '甜甜圈不加糖','薯条配可乐','老王','小明同学','理性消费','路人甲','性价比党',
  '第一次买','谨慎型用户','急性子','被坑了','后悔买了','愤怒的小张','理性消费2',
  '维权中','愤怒市民','老张维权','磕碰了','要发票'
);

INSERT INTO ai_feedback (content, source, author, rating, product) VALUES
  ('用了两周，做工扎实，物流也快，完全超出预期。', '商城评论', '甜甜圈不加糖', 5, '静音机械键盘'),
  ('客服响应很快，问题当天就解决了，点个赞。', '客服工单', '薯条配可乐', 5, '智能手环'),
  ('第二次回购了，家里人都在用，质量稳定。', '商城评论', '老王', 5, '空气炸锅'),
  ('包装很仔细，发货速度也快，好评。', '商城评论', '小明同学', 5, '蓝牙耳机'),
  ('整体还行，中规中矩，没有特别惊艳也没有踩雷。', '商城评论', '理性消费', 3, '养生壶'),
  ('东西能用，颜值一般，和描述差不多。', '商城评论', '路人甲', 3, '收纳箱'),
  ('价格在这个区间算合理，功能基本覆盖需求。', '商城评论', '性价比党', 4, '电动牙刷'),
  ('说明书有点难懂，其他都还好。', '售后反馈', '第一次买', 3, '咖啡机'),
  ('收到货两天了，目前没发现问题，持续观察。', '商城评论', '谨慎型用户', 3, '扫地机器人'),
  ('收到货三天了，还没动静，物流太慢了，等得很不耐烦。', '商城评论', '急性子', 2, '机械键盘'),
  ('收到的东西和图片差别很大，有点失望。', '商城评论', '被坑了', 1, '蓝牙耳机'),
  ('质量太差了，用了三天就坏了，申请退款。', '商城评论', '后悔买了', 1, '养生壶'),
  ('客服态度非常敷衍，问了三次都不回复，体验很差。', '客服工单', '愤怒的小张', 1, '智能手环'),
  ('东西还行但是价格虚高，不值这个价。', '商城评论', '理性消费2', 2, '咖啡机'),
  ('我要投诉！！！发来的杯子有裂缝，已经划到手了，你们必须给个说法！', '社交媒体', '维权中', 1, '马克杯'),
  ('这种服务态度我要曝光，已经向消协举报了，12315 见！', '社交媒体', '愤怒市民', 1, '智能手环'),
  ('骗人的东西，说是原厂结果全是贴牌，要求退款不然就起诉你们。', '社交媒体', '维权中', 1, '空气炸锅'),
  ('拖延发货拖延退款，已经超过承诺时限了，再不处理我就找媒体曝光！', '社交媒体', '老张维权', 1, '电动牙刷'),
  ('包装破损，商品有磕碰，要求换货。', '售后反馈', '磕碰了', 2, '扫地机器人'),
  ('发票开错了，重开一次可以吗？', '售后反馈', '要发票', 4, '机械键盘');
