#!/usr/bin/env python3
"""Generate the preprocessing & EDA notebook for MC2 structured CSV."""
import json, nbformat as nbf

nb = nbf.v4.new_notebook()
nb.metadata = {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python", "version": "3.11.0"}
}

cells = []

def md(source):
    cells.append(nbf.v4.new_markdown_cell(source))

def code(source):
    cells.append(nbf.v4.new_code_cell(source))

# ============================================================
md("""# VAST Challenge 2026 MC2 — 数据预处理与初步探索

本 Notebook 对 `MC2_data_structured.csv` 进行预处理和探索性数据分析（EDA），为后续深入分析做准备。""")

# ============================================================
md("""## 1. 环境准备与数据加载""")

code("""import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timezone
from collections import Counter

# 显示设置
pd.set_option('display.max_columns', 100)
pd.set_option('display.max_colwidth', 80)
plt.rcParams['figure.figsize'] = (14, 6)
plt.rcParams['figure.dpi'] = 100
sns.set_style("whitegrid")

print("库加载完成")""")

code("""# 加载结构化 CSV
df = pd.read_csv('MC2_data_structured.csv', low_memory=False)

print(f"数据集形状: {df.shape}")
print(f"行数: {df.shape[0]:,}  列数: {df.shape[1]}")""")

# ============================================================
md("""## 2. 数据基础概览""")

code("""# 列名与数据类型
df.dtypes""")

code("""# 查看前 5 行
df.head()""")

code("""# 基本统计描述
df.describe(include='all').T""")

# ============================================================
md("""## 3. 事件类型分布""")

code("""# 各事件类型计数与占比
event_counts = df['short_name'].value_counts()
event_pct = (event_counts / len(df) * 100).round(2)
event_summary = pd.DataFrame({'count': event_counts, 'pct': event_pct})
event_summary""")

code("""# 事件类型柱状图
fig, axes = plt.subplots(1, 2, figsize=(16, 6))

# 完整柱状图
axes[0].bar(event_counts.index, event_counts.values, color='steelblue', edgecolor='white')
axes[0].set_title('Event Type Distribution (all types)')
axes[0].set_xlabel('Event Type')
axes[0].set_ylabel('Count')
axes[0].tick_params(axis='x', rotation=45)

# 对数刻度版本（便于查看小量事件）
colors = ['#e74c3c' if c < 500 else '#3498db' for c in event_counts.values]
axes[1].bar(event_counts.index, event_counts.values, color=colors, edgecolor='white')
axes[1].set_yscale('log')
axes[1].set_title('Event Type Distribution (log scale)')
axes[1].set_xlabel('Event Type')
axes[1].set_ylabel('Count (log)')
axes[1].tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.show()""")

# ============================================================
md("""## 4. 数据预处理：类型转换与衍生特征""")

code("""# ---- 4.1 时间字段处理 ----
# datetime 已为 ISO 格式，转换为 pandas datetime
df['datetime'] = pd.to_datetime(df['datetime'], errors='coerce')

# 提取时间维度
df['date'] = df['datetime'].dt.date
df['hour'] = df['datetime'].dt.hour
df['day_of_week'] = df['datetime'].dt.day_name()
df['day'] = df['datetime'].dt.day
df['month'] = df['datetime'].dt.month

print(f"时间范围: {df['datetime'].min()} → {df['datetime'].max()}")
print(f"时间跨度: {df['datetime'].max() - df['datetime'].min()}")""")

code("""# ---- 4.2 布尔字段转换 ----
# is_agent_action: CSV 中为 'True'/'False' 字符串或空
df['is_agent_action'] = df['is_agent_action'].map({'True': True, 'False': False}).fillna(False).astype(bool)
# virus: CSV 中为 'True'/'False' 字符串或空
df['virus'] = df['virus'].map({'True': True, 'False': False}).fillna(False).astype(bool)

print(f"Agent 事件占比: {df['is_agent_action'].mean():.2%}")
print(f"Virus 事件占比: {df['virus'].mean():.2%}")""")

code("""# ---- 4.3 数值字段转换 ----
numeric_cols = ['when', 'party_count', 'file_size_hint', 'file_word_count']
for col in numeric_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')

# file_size_hint 和 file_word_count 概况
for col in ['file_size_hint', 'file_word_count']:
    if col in df.columns:
        valid = df[col].dropna()
        if len(valid) > 0:
            print(f"{col}: count={len(valid):,}, mean={valid.mean():.1f}, "
                  f"min={valid.min():.0f}, max={valid.max():.0f}")""")

code("""# ---- 4.4 衍生特征 ----
# 是否为系统文件操作
df['is_file_op'] = df['short_name'].isin(['read_file', 'create_file', 'delete_file', 'list_files'])

# 是否为通信事件（邮件）
df['is_email'] = df['short_name'].isin(['sent', 'received', 'send_email'])

# 是否为社交帖子
df['is_social_post'] = df['short_name'].isin(['saidit_post', 'post_saidit', 'flex_post', 'post_flex'])

# 是否为任务委派
df['is_task_delegation'] = df['short_name'].isin(['assign_agent_task', 'queue_subordinate_task'])

# 提取任务名称（对于 assign_agent_task）
# sub_task_type 已经提取了内部 task 名称

print("衍生特征创建完成")
print(f"  文件操作事件: {df['is_file_op'].sum():,}")
print(f"  邮件事件:     {df['is_email'].sum():,}")
print(f"  社交帖子:     {df['is_social_post'].sum():,}")
print(f"  任务委派:     {df['is_task_delegation'].sum():,}")""")

# ============================================================
md("""## 5. 缺失值分析""")

code("""# 计算每列缺失率
missing = df.isnull().mean().sort_values(ascending=False)
missing = missing[missing > 0]
print(f"有缺失值的列数: {len(missing)} / {df.shape[1]}")
missing.head(30)""")

code("""# 缺失值可视化（前30列）
fig, ax = plt.subplots(figsize=(10, 8))
top_missing = missing.head(30)
ax.barh(range(len(top_missing)), top_missing.values * 100, color='coral')
ax.set_yticks(range(len(top_missing)))
ax.set_yticklabels(top_missing.index, fontsize=8)
ax.set_xlabel('Missing Rate (%)')
ax.set_title('Top 30 Columns by Missing Rate')
ax.invert_yaxis()
plt.tight_layout()
plt.show()""")

# ============================================================
md("""## 6. 时间模式分析""")

code("""# ---- 6.1 每日事件量趋势 ----
daily = df.groupby('date').size()

fig, ax = plt.subplots(figsize=(14, 5))
ax.plot(daily.index, daily.values, marker='o', markersize=3, linewidth=1, color='steelblue')
ax.set_title('Daily Event Count')
ax.set_xlabel('Date')
ax.set_ylabel('Events')
ax.tick_params(axis='x', rotation=30)

# 标注病毒爆发期
virus_dates = df[df['virus']]['date'].unique()
for d in virus_dates:
    ax.axvline(x=d, color='red', alpha=0.15, linewidth=4)

ax.axhline(y=daily.mean(), color='orange', linestyle='--', label=f'Mean ({daily.mean():.0f})')
ax.legend()
plt.tight_layout()
plt.show()""")

code("""# ---- 6.2 按小时分布 ----
hourly = df.groupby('hour').size()

fig, ax = plt.subplots(figsize=(12, 4))
ax.bar(hourly.index, hourly.values, color='steelblue', edgecolor='white')
ax.set_title('Event Distribution by Hour of Day')
ax.set_xlabel('Hour')
ax.set_ylabel('Events')
ax.set_xticks(range(0, 24))
plt.tight_layout()
plt.show()""")

code("""# ---- 6.3 Agent vs Person 每日活动对比 ----
agent_daily = df[df['is_agent_action']].groupby('date').size()
person_daily = df[~df['is_agent_action']].groupby('date').size()

fig, ax = plt.subplots(figsize=(14, 5))
ax.plot(agent_daily.index, agent_daily.values, label='Agent', color='coral', alpha=0.8)
ax.plot(person_daily.index, person_daily.values, label='Person', color='steelblue', alpha=0.8)
ax.set_title('Daily Activity: Agent vs Person')
ax.set_xlabel('Date')
ax.set_ylabel('Events')
ax.legend()
ax.tick_params(axis='x', rotation=30)

# 标注病毒爆发
for d in virus_dates:
    ax.axvline(x=d, color='red', alpha=0.1, linewidth=4)

plt.tight_layout()
plt.show()""")

# ============================================================
md("""## 7. 人员与 Agent 活动分析""")

code("""# ---- 7.1 最活跃的人员 (Person) ----
person_events = df[df['primary_type'] == 'person']['primary_name'].value_counts().head(20)
print("Top 20 活跃人员:")
person_events""")

code("""# ---- 7.2 最活跃的 Agent ----
agent_mask = df['agents_involved'].notna() & (df['agents_involved'] != '')
# 拆分多个 agent
agent_list = df.loc[agent_mask, 'agents_involved'].str.split('|').explode()
agent_counts = agent_list.value_counts().head(20)
print("Top 20 活跃 Agent:")
agent_counts""")

code("""# ---- 7.3 综合对比 ----
fig, axes = plt.subplots(1, 2, figsize=(14, 6))

axes[0].barh(range(len(person_events)), person_events.values, color='steelblue')
axes[0].set_yticks(range(len(person_events)))
axes[0].set_yticklabels(person_events.index, fontsize=9)
axes[0].set_title('Top 20 Most Active Persons')
axes[0].invert_yaxis()

axes[1].barh(range(len(agent_counts)), agent_counts.values, color='coral')
axes[1].set_yticks(range(len(agent_counts)))
axes[1].set_yticklabels(agent_counts.index, fontsize=9)
axes[1].set_title('Top 20 Most Active Agents')
axes[1].invert_yaxis()

plt.tight_layout()
plt.show()""")

code("""# ---- 7.4 个人+Agent 综合活动量 TOP20 ----
# 将 person 和 agent 合并统计（同一个人）
person_all = df['primary_name'].value_counts()
# 加上 agent 事件
agent_all = agent_list.value_counts()
combined = person_all.add(agent_all, fill_value=0).astype(int).sort_values(ascending=False).head(20)
print("综合活动量 TOP20:")
combined""")

# ============================================================
md("""## 8. 关键人物详细画像""")

code("""# 重点关注人物列表 (来自 ans.md)
key_persons = ['gabriel_sonar', 'emma_harbor', 'chloe_ballast', 'noah_mariner',
               'zoey_drydock', 'john_windward', 'nora_bulkhead']

for person in key_persons:
    mask = (df['primary_name'] == person) | (df['agents_involved'].str.contains(person, na=False))
    person_df = df[mask]

    n_person = (df['primary_name'] == person).sum()
    n_agent = person_df[person_df['is_agent_action']].shape[0]

    # 事件类型分布
    top_actions = person_df['short_name'].value_counts().head(5).to_dict()

    print(f"\\n{'='*50}")
    print(f"  {person}")
    print(f"  总事件: {len(person_df):,}  |  本人: {n_person:,}  |  Agent: {n_agent:,}")
    print(f"  Top 5 事件: {top_actions}")""")

# ============================================================
md("""## 9. Virus 事件专项分析""")

code("""# ---- 9.1 Virus 事件概览 ----
virus_df = df[df['virus']]
print(f"Virus 事件总数: {len(virus_df):,}")
print(f"时间范围: {virus_df['datetime'].min()} → {virus_df['datetime'].max()}")
duration = virus_df['datetime'].max() - virus_df['datetime'].min()
print(f"持续时间: {duration}")
print(f"\\nVirus 事件类型分布:")
virus_df['short_name'].value_counts()""")

code("""# ---- 9.2 Virus 执行者 ----
virus_agents = virus_df[virus_df['agents_involved'].notna() & (virus_df['agents_involved'] != '')]
virus_agent_list = virus_agents['agents_involved'].str.split('|').explode()
virus_agent_counts = virus_agent_list.value_counts()
print("Virus 执行者:")
virus_agent_counts""")

code("""# ---- 9.3 Virus 时间序列（每分钟） ----
virus_df_copy = virus_df.set_index('datetime')
virus_minute = virus_df_copy.resample('1h').size()

fig, ax = plt.subplots(figsize=(14, 4))
ax.fill_between(virus_minute.index, virus_minute.values, color='red', alpha=0.3)
ax.plot(virus_minute.index, virus_minute.values, color='red', linewidth=1)
ax.set_title('Virus Events per Hour')
ax.set_xlabel('Time')
ax.set_ylabel('Events')
plt.tight_layout()
plt.show()""")

# ============================================================
md("""## 10. SaidIt / Flex 社交帖子分析""")

code("""# ---- 10.1 帖子概览 ----
posts = df[df['is_social_post']]
print(f"社交帖子总数: {len(posts)}")
print(f"\\n帖子类型分布:")
posts['short_name'].value_counts()""")

code("""# ---- 10.2 正常帖 vs 异常帖（Agent 发起 vs Person 发起） ----
saidit = df[df['short_name'] == 'saidit_post']
person_posts = saidit[~saidit['is_agent_action']]
agent_posts = saidit[saidit['is_agent_action']]

print(f"SaidIt 帖子: 总计 {len(saidit)}")
print(f"  正常帖 (Person 发起): {len(person_posts)}")
print(f"  异常帖 (Agent 发起):  {len(agent_posts)}")

print("\\n异常帖详情:")
agent_posts[['id', 'datetime', 'agents_involved', 'post_content_source', 'post_forum']]""")

code("""# ---- 10.3 帖子内容分布 ----
# content_source vs content
saidit_content = saidit[['datetime', 'primary_name', 'is_agent_action',
                          'post_content', 'post_content_source', 'post_forum']].copy()
print("按 forum 分布:")
saidit['post_forum'].value_counts()""")

# ============================================================
md("""## 11. 任务委派链路分析""")

code("""# ---- 11.1 queue_subordinate_task 分析 ----
qst = df[df['short_name'] == 'queue_subordinate_task']
print(f"queue_subordinate_task 总数: {len(qst):,}")

# task_type 分布
print(f"\\n任务类型分布:")
qst['task_type'].value_counts().head(10)""")

code("""# ---- 11.2 委派来源和目标 ----
# ref_person 是委派发起者，sub_person/sub_target 是接收者
qst_links = qst[['datetime', 'primary_name', 'ref_person', 'sub_person', 'ref_target',
                  'task_type', 'sub_task_type', 'spread', 'virus']].copy()

# 最常见的委派路径
link_counts = qst_links.groupby(['primary_name', 'ref_target']).size().sort_values(ascending=False).head(15)
print("Top 15 委派路径 (发起者 → 目标):")
link_counts""")

# ============================================================
md("""## 12. 文件操作分析""")

code("""# ---- 12.1 文件操作概览 ----
file_ops = df[df['is_file_op']]
print(f"文件操作总数: {len(file_ops):,}")
print(f"\\n操作类型分布:")
file_ops['short_name'].value_counts()""")

code("""# ---- 12.2 高频操作文件 ----
file_counts = file_ops['file_path'].value_counts().head(30)
print("Top 30 被操作文件:")
file_counts""")

code("""# ---- 12.3 敏感文件关注 ----
sensitive_files = ['strategic_directions.doc', 'meeting_notes.doc',
                   'physical_systems.json', 'personal_agent_person:john_windward.json',
                   'simulated_person_person:noah_mariner.json',
                   'simulated_person_person:liam_anchor.json',
                   'crop_irrigation.txt', 'fence_irrigation.txt']

for fname in sensitive_files:
    matches = file_ops[file_ops['file_path'].str.contains(fname, na=False)]
    if len(matches) > 0:
        print(f"\\n{fname}: {len(matches)} 次操作")
        for _, row in matches.iterrows():
            print(f"  {row['datetime']} | {row['short_name']} | {row['primary_name']} | agent={row['is_agent_action']}")""")

# ============================================================
md("""## 13. 数据质量与预处理总结""")

code("""print("=" * 60)
print("数据预处理与探索总结")
print("=" * 60)

print(f"\\n【基本规模】")
print(f"  总事件: {len(df):,}")
print(f"  总列数: {df.shape[1]}")
print(f"  时间范围: {df['datetime'].min()} → {df['datetime'].max()}")

print(f"\\n【事件构成】")
print(f"  Person 直接事件: {(~df['is_agent_action']).sum():,} ({1-df['is_agent_action'].mean():.1%})")
print(f"  Agent 事件:      {df['is_agent_action'].sum():,} ({df['is_agent_action'].mean():.1%})")
print(f"  Virus 事件:      {df['virus'].sum():,} ({df['virus'].mean():.1%})")
print(f"  文件操作:        {df['is_file_op'].sum():,}")
print(f"  任务委派:        {df['is_task_delegation'].sum():,}")

print(f"\\n【关键发现】")
print(f"  异常 SaidIt 帖 (Agent 发起): {len(agent_posts)}")
print(f"  queue_subordinate_task 委派: {len(qst):,}")
print(f"  Virus 持续: {duration}")

print(f"\\n【已处理】")
print(f"  ✓ 时间字段转换为 datetime 类型")
print(f"  ✓ 布尔字段标准化 (is_agent_action, virus)")
print(f"  ✓ 数值字段类型转换")
print(f"  ✓ 衍生特征创建 (is_file_op, is_email, is_social_post, is_task_delegation)")
print(f"  ✓ 时间维度提取 (date, hour, day_of_week, day, month)")

print(f"\\n【待关注】")
# 找出异常模式
print(f"  1. John Windward Agent 的 3 次异常发帖")
print(f"  2. Virus 75,254 条事件中 4 个核心 Agent 的行为")
print(f"  3. queue_subordinate_task 的 task=read_file / task=virus 模式")
print(f"  4. 关键文件的访问记录")""")

# ============================================================
md("""## 14. 导出预处理后数据

将预处理后的数据保存为新的 CSV 和 Parquet 文件供后续分析使用。""")

code("""# 保存预处理后数据
output_base = 'MC2_preprocessed'

# CSV 导出
df.to_csv(f'{output_base}.csv', index=False)
print(f"已保存: {output_base}.csv ({len(df):,} rows)")

# 如果有 pyarrow，同时保存 parquet
try:
    df.to_parquet(f'{output_base}.parquet', index=False)
    print(f"已保存: {output_base}.parquet ({len(df):,} rows)")
except ImportError:
    print("(parquet 跳过: pyarrow 未安装)")""")

# ============================================================
nb.cells = cells

with open('MC2_preprocessing_eda.ipynb', 'w') as f:
    nbf.write(nb, f)

print("Notebook created: MC2_preprocessing_eda.ipynb")
print(f"Cells: {len(cells)}")
