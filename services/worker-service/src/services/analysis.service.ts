import OpenAI from 'openai';
import { getEnv } from '../config';

export interface ReviewFinding {
  line?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface AnalysisResult {
  bugs: ReviewFinding[];
  security: ReviewFinding[];
  performance: ReviewFinding[];
  improvements: ReviewFinding[];
  score: number;
  summary: string;
  rawResponse?: string;
}

function createFallbackAnalysis(code: string): AnalysisResult {
  const findings: AnalysisResult = {
    bugs: [],
    security: [],
    performance: [],
    improvements: [],
    score: 100,
    summary: 'No major issues detected by heuristic analyzer.'
  };

  const lowered = code.toLowerCase();

  if (lowered.includes('eval(')) {
    findings.security.push({ severity: 'critical', description: 'Use of eval detected; this is a security risk.' });
    findings.score -= 25;
  }

  if (lowered.includes('innerhtml')) {
    findings.security.push({ severity: 'high', description: 'Direct innerHTML assignment may lead to XSS.' });
    findings.score -= 15;
  }

  if (lowered.includes('console.log')) {
    findings.improvements.push({ severity: 'low', description: 'Remove debug logging before production deployment.' });
    findings.score -= 2;
  }

  if (lowered.includes('for (') && lowered.includes('push(')) {
    findings.performance.push({ severity: 'medium', description: 'Nested iteration detected; review for possible O(n²) behavior.' });
    findings.score -= 5;
  }

  if (lowered.includes('settimeout(') && lowered.includes('0)')) {
    findings.improvements.push({ severity: 'low', description: 'Consider eliminating zero-delay timers where possible.' });
    findings.score -= 1;
  }

  findings.score = Math.max(0, findings.score);
  findings.summary = findings.security.length > 0 || findings.performance.length > 0 ? 'Heuristic analyzer found actionable issues.' : findings.summary;
  return findings;
}

export async function analyzeCode(input: { language: string; filePath: string; code: string }): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return createFallbackAnalysis(input.code);
  }

  const client = new OpenAI({ apiKey });
  const model = getEnv('OPENAI_MODEL', 'gpt-4o-mini');

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a senior software engineer. Analyze code for bugs, security vulnerabilities, performance issues, and code improvements. Return strict JSON with keys bugs, security, performance, improvements, score, summary.'
      },
      {
        role: 'user',
        content: `Language: ${input.language}\nFile: ${input.filePath}\n\nCode:\n${input.code}`
      }
    ],
    response_format: { type: 'json_object' }
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as Partial<AnalysisResult>;

  return {
    bugs: Array.isArray(parsed.bugs) ? parsed.bugs as ReviewFinding[] : [],
    security: Array.isArray(parsed.security) ? parsed.security as ReviewFinding[] : [],
    performance: Array.isArray(parsed.performance) ? parsed.performance as ReviewFinding[] : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements as ReviewFinding[] : [],
    score: typeof parsed.score === 'number' ? parsed.score : 100,
    summary: typeof parsed.summary === 'string' ? parsed.summary : 'AI analysis completed.',
    rawResponse: raw
  };
}
