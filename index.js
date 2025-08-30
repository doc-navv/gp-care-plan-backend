// Australian GP Chronic Care Management Plan Generator API
// Secure serverless function for Vercel deployment

export default async function handler(req, res) {
  // CORS and Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { conditions } = req.body;
    
    // Validate input
    if (!conditions || conditions.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Patient conditions are required' 
      });
    }

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      });
    }

    // Sanitize input
    const sanitizedConditions = conditions.replace(/[<>]/g, '').trim();
    
    // Your complete GP CCMP prompt
    const CARE_PLAN_PROMPT = `Act as an experienced Australian General Practitioner creating a GP Chronic Condition Management Plan (GPCCMP) under the current MBS guidelines (effective from July 1, 2025).

I will provide you with a list of the patient's chronic conditions.

**IMPORTANT: Please provide your response as a structured format containing the completed tables so I can directly use them in my CarePlan template.**

Generate the following structured output with clean, black and white table formatting:

## 📋 Table 1: GP Chronic Condition Management Plan

Create a table with the following exact format:

| Patient problems / needs / relevant conditions | Goals – changes to be achieved | Required treatments and services including patient actions | Arrangements for treatments/services (when, who, contact details) |
|---|---|---|---|
| [Condition 1] | [SMART goal with timeframe] | [Planned interventions, services, lifestyle advice, patient actions] | [Referrals, follow-up schedule, contact details] |
| [Condition 2] | [SMART goal with timeframe] | [Planned interventions, services, lifestyle advice, patient actions] | [Referrals, follow-up schedule, contact details] |
| [Condition 3] | [SMART goal with timeframe] | [Planned interventions, services, lifestyle advice, patient actions] | [Referrals, follow-up schedule, contact details] |

**Table 1 Requirements:**
- Each goal must be SMART (Specific, Measurable, Achievable, Relevant, Time-bound) with clear 3-6 month timeframes
- Include evidence-based interventions appropriate to each condition
- Specify relevant lifestyle modifications and clear patient responsibilities
- Include appropriate allied health referrals (physiotherapy, dietitian, podiatry, etc.)
- Add specific review and monitoring schedules in the 'Arrangements' column
- Use professional medical terminology appropriate for MBS documentation
- Keep each cell concise but comprehensive for clinical practice

## 📋 Table 2: Allied Health Professional Arrangements

Create a table with this exact format:

| Goals – changes to be achieved | Required treatments and services including patient actions | Arrangements for treatments/services (when, who, contact details) |
|---|---|---|
| 1. [SMART allied health goal] | [Specific interventions and patient actions] | [Provider type, frequency, duration, contact method] |
| 2. [SMART allied health goal] | [Specific interventions and patient actions] | [Provider type, frequency, duration, contact method] |
| 3. [SMART allied health goal] | [Specific interventions and patient actions] | [Provider type, frequency, duration, contact method] |
| 4. [SMART allied health goal] | [Specific interventions and patient actions] | [Provider type, frequency, duration, contact method] |
| 5. [SMART allied health goal] | [Specific interventions and patient actions] | [Provider type, frequency, duration, contact method] |

**Table 2 Requirements:**
- Extract and prioritize the most clinically relevant allied health goals from the conditions provided
- Each goal must be SMART, condition-specific, and measurable
- Include both professional interventions and clear patient responsibilities
- Specify recommended frequency (e.g., "Weekly for 6 weeks, then fortnightly")
- Include appropriate allied health disciplines based on evidence-based guidelines
- Leave unused rows empty if fewer than 5 goals are clinically appropriate
- Ensure content aligns with MBS allied health referral requirements

**Document Formatting Requirements:**
- Use standard table formatting with clear borders
- Use professional medical font formatting
- Include proper table headers in bold
- Include document header: "GP Chronic Condition Management Plan - [Current Date]"
- Add footer with: "Generated under MBS Guidelines effective July 1, 2025"

**Clinical Standards:**
- Ensure all content complies with current Australian clinical practice guidelines
- Include appropriate safety netting and red flag monitoring where relevant
- Use evidence-based interventions and realistic timeframes
- Prioritize clinically significant and achievable interventions
- Maintain professional medical documentation standards

**Please create the structured care plan upon completion.**

My conditions are: `;

    // Make API request to OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: CARE_PLAN_PROMPT + sanitizedConditions
        }],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      
      if (openaiResponse.status === 429) {
        return res.status(429).json({ 
          success: false, 
          error: 'API rate limit exceeded. Please try again later.' 
        });
      } else if (openaiResponse.status === 401) {
        return res.status(500).json({ 
          success: false, 
          error: 'Invalid API key configuration.' 
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          error: 'OpenAI service temporarily unavailable.' 
        });
      }
    }

    const completion = await openaiResponse.json();
    const carePlan = completion.choices[0].message.content;
    
    // Log successful generation (without sensitive data)
    console.log(`Care plan generated successfully. Length: ${carePlan.length} characters`);
    
    res.status(200).json({ 
      success: true, 
      carePlan: carePlan,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating care plan:', error.message);
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate care plan. Please try again.' 
    });
  }
}
