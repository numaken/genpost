// lib/bandit.ts - UCB1バンディット（A/B最適化）

/**
 * UCB1アルゴリズムによるバンディット最適化
 * CTA、見出し、その他要素のA/Bテストに使用
 */
export class UCB1 {
  public choices: string[]
  private counts: Map<string, number> = new Map()
  private rewards: Map<string, number> = new Map()
  private totalPlays = 0

  constructor(choices: string[]) {
    this.choices = choices
    choices.forEach(choice => {
      this.counts.set(choice, 0)
      this.rewards.set(choice, 0)
    })
  }

  /**
   * UCB1アルゴリズムで最適な選択肢を選ぶ
   */
  pick(): string {
    // 全ての選択肢が少なくとも1回は試されるまでは順番に
    const untried = this.choices.find(choice => this.counts.get(choice) === 0)
    if (untried) return untried

    // UCB1スコア計算
    let bestChoice = this.choices[0]
    let bestScore = -Infinity

    this.choices.forEach(choice => {
      const count = this.counts.get(choice) || 1
      const reward = this.rewards.get(choice) || 0
      const avgReward = reward / count
      const confidence = Math.sqrt(2 * Math.log(this.totalPlays) / count)
      const ucb1Score = avgReward + confidence

      if (ucb1Score > bestScore) {
        bestScore = ucb1Score
        bestChoice = choice
      }
    })

    return bestChoice
  }

  /**
   * フィードバックを記録（クリック率、コンバージョン率など）
   * @param choice 選択した選択肢
   * @param reward 報酬（0-1の数値、例：0.05 = 5%のクリック率）
   */
  feedback(choice: string, reward: number) {
    if (!this.choices.includes(choice)) {
      throw new Error(`Unknown choice: ${choice}`)
    }

    this.counts.set(choice, (this.counts.get(choice) || 0) + 1)
    this.rewards.set(choice, (this.rewards.get(choice) || 0) + reward)
    this.totalPlays++
  }

  /**
   * 現在の統計情報を取得
   */
  getStats() {
    return this.choices.map(choice => ({
      choice,
      plays: this.counts.get(choice) || 0,
      totalReward: this.rewards.get(choice) || 0,
      avgReward: this.counts.get(choice) ? (this.rewards.get(choice) || 0) / (this.counts.get(choice) || 1) : 0
    }))
  }

  /**
   * 状態をJSON形式で保存
   */
  serialize(): string {
    return JSON.stringify({
      choices: this.choices,
      counts: Array.from(this.counts.entries()),
      rewards: Array.from(this.rewards.entries()),
      totalPlays: this.totalPlays
    })
  }

  /**
   * JSON形式から状態を復元
   */
  static deserialize(data: string): UCB1 {
    const parsed = JSON.parse(data)
    const bandit = new UCB1(parsed.choices)
    bandit.counts = new Map(parsed.counts)
    bandit.rewards = new Map(parsed.rewards)
    bandit.totalPlays = parsed.totalPlays
    return bandit
  }
}