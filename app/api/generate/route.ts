import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import OpenAI from 'openai'
import { getPromptById, hasUserPurchased, recordPromptUsage, processPromptTemplate } from '@/lib/prompts'
import { getEffectiveApiKey, getUserApiKey } from '@/lib/api-keys'
import { canUseSharedApiKey, incrementUsage } from '@/lib/usage-limits'
import { getPromptVersion, recordABTestResult, calculateQualityScore } from '@/lib/prompt-versions'

// 生成された記事からタイトルと本文を抽出・整形する関数
function parseGeneratedArticle(rawContent: string, promptName: string): { title: string, content: string } {
  let title = ''
  let content = ''
  
  try {
    // パターン1: 【タイトル】形式の場合
    const titleMatch = rawContent.match(/【タイトル】\s*\n+([\s\S]*?)\n*(?=\n*【|$)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    // パターン2: 記事内容の抽出（複数のパターンに対応）
    const contentPatterns = [
      /【記事(?:内容)?】\s*\n([\s\S]*?)(?=\n*【[^】]+】|$)/, // 【記事】【記事内容】
      /【本文】\s*\n([\s\S]*?)(?=\n*【[^】]+】|$)/, // 【本文】
      /【内容】\s*\n([\s\S]*?)(?=\n*【[^】]+】|$)/, // 【内容】
      /【コンテンツ】\s*\n([\s\S]*?)(?=\n*【[^】]+】|$)/, // 【コンテンツ】
    ];
    
    for (const pattern of contentPatterns) {
      const contentMatch = rawContent.match(pattern);
      if (contentMatch) {
        content = contentMatch[1].trim();
        break;
      }
    }
    
    // パターン3: マークアップなしの場合（通常の文章）
    if (!title && !content) {
      // 【...】マークアップが全くない場合、最初の行をタイトル、残りを本文とする
      const lines = rawContent.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        title = lines[0].trim();
        content = lines.slice(1).join('\n').trim();
      }
    }
    
    // パターン4: 構造化マークアップがあるが特定のパターンでない場合
    if (!title || !content) {
      // 全ての【...】マークアップを除去
      const cleanedText = rawContent.replace(/【[^】]+】\s*\n*/g, '').trim();
      
      if (!title) {
        // 最初の段落をタイトルとして使用
        const firstParagraph = cleanedText.split('\n\n')[0];
        title = firstParagraph.split('\n')[0].trim();
      }
      
      if (!content) {
        // タイトル以外を本文として使用
        const paragraphs = cleanedText.split('\n\n');
        if (paragraphs.length > 1) {
          content = paragraphs.slice(1).join('\n\n').trim();
        } else {
          // 単一段落の場合、2行目以降を本文とする
          const lines = cleanedText.split('\n');
          content = lines.slice(1).join('\n').trim();
        }
      }
    }
    
    // フォールバック処理
    if (!title) {
      title = `${promptName} - ${new Date().toLocaleString('ja-JP')}`;
    }
    
    if (!content) {
      content = rawContent.replace(/【[^】]+】\s*\n*/g, '').trim();
    }
    
    // HTMLエンティティのエスケープ
    title = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    content = content.replace(/\n\n+/g, '\n\n'); // 過度な改行を整理
    
  } catch (error) {
    console.error('Article parsing error:', error);
    // エラー時のフォールバック
    const cleanedText = rawContent.replace(/【[^】]+】\s*\n*/g, '').trim();
    const lines = cleanedText.split('\n').filter(line => line.trim() !== '');
    title = lines.length > 0 ? lines[0].trim() : `${promptName} - ${new Date().toLocaleString('ja-JP')}`;
    content = lines.length > 1 ? lines.slice(1).join('\n').trim() : cleanedText;
  }
  
  return { title, content };
}

export async function POST(request: NextRequest) {
  try {
    // セッション取得
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { config, promptId, count, postStatus = 'draft', scheduledStartDate, scheduledInterval = 1, inputs } = body

    if (!config.wpSiteUrl || !config.wpUser || !config.wpAppPass) {
      return NextResponse.json({ error: 'WordPress設定が不完全です' }, { status: 400 })
    }

    const userId = session.user.email

    // プロンプトバージョン取得（A/Bテスト対応）
    let promptVersion = await getPromptVersion(promptId, userId)
    if (!promptVersion) {
      // フォールバック: 従来版プロンプト取得
      const prompt = await getPromptById(promptId)
      if (!prompt) {
        return NextResponse.json({ error: '無効なプロンプトです' }, { status: 400 })
      }
      // 従来版用の構造に変換
      promptVersion = {
        id: prompt.id,
        prompt_id: prompt.prompt_id,
        version: 'v1.0',
        version_name: '従来版',
        system_prompt: prompt.system_prompt,
        user_prompt_template: prompt.user_prompt_template,
        gen_config: prompt.gen_config,
        quality_settings: {},
        is_active: prompt.is_active,
        is_default: true
      }
    }

    // 購入確認（従来版との互換性のため）
    const originalPrompt = await getPromptById(promptId)
    if (originalPrompt) {
      const canUse = originalPrompt.is_free || await hasUserPurchased(userId, promptId)
      if (!canUse) {
        return NextResponse.json({ error: 'このプロンプトは購入されていません' }, { status: 403 })
      }
    }

    const articles = []

    // プロンプトテンプレート処理
    const processedUserPrompt = processPromptTemplate(promptVersion.user_prompt_template, inputs || {})

    // 指定された記事数分生成
    for (let i = 0; i < count; i++) {
      try {
        // 使用履歴記録
        await recordPromptUsage(userId, promptId)

        // APIキーと制限チェック
        const userApiKey = await getUserApiKey(userId, 'openai')
        const usingSharedApiKey = !userApiKey
        
        if (usingSharedApiKey) {
          const usageCheck = await canUseSharedApiKey(userId, userApiKey)
          if (!usageCheck.canUse) {
            return NextResponse.json({ 
              error: usageCheck.reason || '共有APIキーの使用制限に達しました',
              usage: usageCheck.usage,
              subscription: usageCheck.subscription,
              bypassWithBYOK: !usageCheck.bypassLimits
            }, { status: 403 })
          }
        }

        // ユーザーのAPIキーを取得してOpenAIクライアントを初期化
        const effectiveApiKey = await getEffectiveApiKey(userId)
        const userOpenAI = new OpenAI({
          apiKey: effectiveApiKey,
        })

        // OpenAI APIで記事生成（改良版設定を適用）
        const genConfig = promptVersion.gen_config || {}
        const startTime = Date.now()
        
        const completion = await userOpenAI.chat.completions.create({
          model: genConfig.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: promptVersion.system_prompt },
            { role: 'user', content: processedUserPrompt }
          ],
          temperature: genConfig.temperature || 0.5,
          max_tokens: genConfig.max_tokens || 2000,
          top_p: genConfig.top_p || 0.9,
          presence_penalty: genConfig.presence_penalty || 0.1,
          frequency_penalty: genConfig.frequency_penalty || 0.1
        })
        
        const generationTime = Date.now() - startTime

        let rawContent = completion.choices[0].message.content?.trim() || ''

        // 生成された記事からタイトルと内容を解析・抽出
        console.log('Raw AI content:', rawContent)
        console.log('Using prompt version:', promptVersion.version, promptVersion.version_name)
        
        const { title: extractedTitle, content: cleanContent } = parseGeneratedArticle(rawContent, promptVersion.version_name)
        console.log('Extracted title:', extractedTitle)
        console.log('Extracted content preview:', cleanContent.substring(0, 100) + '...')
        
        // 品質スコア計算（A/Bテスト用）
        const qualityScore = await calculateQualityScore(rawContent, promptVersion.quality_settings)

        // 重複チェック: 同じタイトルの記事が存在するかチェック
        const duplicateCheckUrl = `${config.wpSiteUrl}/wp-json/wp/v2/posts?search=${encodeURIComponent(extractedTitle)}&per_page=5`
        const duplicateResponse = await fetch(duplicateCheckUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${config.wpUser}:${config.wpAppPass}`).toString('base64')}`,
          }
        })

        if (duplicateResponse.ok) {
          const existingPosts = await duplicateResponse.json()
          const duplicateFound = existingPosts.some((post: any) => 
            post.title.rendered.toLowerCase().trim() === extractedTitle.toLowerCase().trim()
          )

          if (duplicateFound) {
            console.log(`Duplicate title found, skipping: ${extractedTitle}`)
            articles.push({
              title: extractedTitle,
              status: 'skipped',
              reason: '同じタイトルの記事が既に存在します'
            })
            continue
          }
        }

        // 予約投稿の場合、各記事の投稿日時を計算
        let postData: any = {
          title: extractedTitle,
          content: cleanContent,
          status: postStatus === 'scheduled' ? 'future' : postStatus,
          categories: [parseInt(config.categoryId) || 1],
          meta: {
            'genpost_prompt_id': promptId,
            'genpost_generated': true
          }
        }

        // 予約投稿の場合、日時を設定
        if (postStatus === 'scheduled' && scheduledStartDate) {
          const baseDate = new Date(scheduledStartDate)
          const publishDate = new Date(baseDate.getTime() + (i * scheduledInterval * 24 * 60 * 60 * 1000))
          postData.date = publishDate.toISOString()
        }

        // WordPress REST APIで投稿
        const wpResponse = await fetch(`${config.wpSiteUrl}/wp-json/wp/v2/posts`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${config.wpUser}:${config.wpAppPass}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData)
        })

        if (wpResponse.ok) {
          const wpData = await wpResponse.json()
          
          // 記事生成成功時に使用量を増加（共有APIキーの場合のみ）
          if (usingSharedApiKey) {
            await incrementUsage(userId, true)
          }
          
          // A/Bテスト結果を記録
          await recordABTestResult({
            user_id: userId,
            prompt_id: promptId,
            version_used: promptVersion.version,
            article_generated: rawContent,
            generation_time_ms: generationTime,
            quality_score: qualityScore,
            metrics: {
              title_extracted: !!extractedTitle,
              content_length: cleanContent.length,
              has_structure: rawContent.includes('##'),
              wordpress_post_id: wpData.id
            }
          })
          
          articles.push({
            id: wpData.id,
            title: wpData.title.rendered,
            status: 'success',
            url: wpData.link,
            version: promptVersion.version,
            version_name: promptVersion.version_name,
            quality_score: qualityScore,
            publishDate: postStatus === 'scheduled' && scheduledStartDate ? 
              new Date(new Date(scheduledStartDate).getTime() + (i * scheduledInterval * 24 * 60 * 60 * 1000)).toLocaleString('ja-JP') : 
              undefined
          })
        } else {
          const errorText = await wpResponse.text()
          console.error('WordPress post failed:', {
            status: wpResponse.status,
            statusText: wpResponse.statusText,
            response: errorText,
            requestUrl: `${config.wpSiteUrl}/wp-json/wp/v2/posts`,
            user: config.wpUser
          })
          articles.push({
            error: `WordPress投稿に失敗しました (${wpResponse.status}): ${errorText}`,
            status: 'error'
          })
        }

        // レート制限対策: 各記事間に5秒待機
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000))
        }

      } catch (error) {
        articles.push({
          error: `記事${i + 1}の生成に失敗: ${error}`,
          status: 'error'
        })
      }
    }

    return NextResponse.json({
      id: Date.now().toString(),
      promptId,
      promptName: prompt.name,
      count,
      status: 'completed',
      articles,
      createdAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json({ error: '記事生成中にエラーが発生しました' }, { status: 500 })
  }
}