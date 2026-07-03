// src/modules/code-runner/code-runner.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CodeRunnerService {
  private readonly logger = new Logger(CodeRunnerService.name);
  private readonly judge0BaseUrl: string;

  constructor(private configService: ConfigService) {
    // Dùng local Judge0 hoặc lấy từ .env
    this.judge0BaseUrl =
      this.configService.get<string>('JUDGE0_BASE_URL') ||
      'http://localhost:2358';
  }

  private getLanguageId(language: string): number {
    const map: Record<string, number> = {
      javascript: 63,
      python: 71,
      java: 62,
      cpp: 54,
      c: 50,
    };

    return map[language] || 63;
  }

  async runCode(params: { code: string; language: string; testCases: any[] }) {
    const results: any[] = [];
    let passedCount = 0;

    for (const testCase of params.testCases) {
      const result = await this.executeSingleTest(
        params.code,
        params.language,
        testCase.input,
        testCase.expected,
      );

      results.push({
        testCase: testCase.description || 'Test case',
        passed: result.passed,
        output: result.output,
        expected: testCase.expected,
        error: result.error,
      });

      if (result.passed) passedCount++;
    }

    const total = params.testCases.length;
    const allPassed = passedCount === total;
    const score = total > 0 ? Math.round((passedCount / total) * 100) : 0;

    return {
      passed: allPassed,
      score,
      totalTests: total,
      passedTests: passedCount,
      results,
      feedback: allPassed
        ? '🎉 Chúc mừng! Bạn đã vượt qua tất cả test cases!'
        : `⚠️ Bạn đã vượt qua ${passedCount}/${total} test cases. Hãy thử lại.`,
    };
  }

  private async executeSingleTest(
    code: string,
    language: string,
    input: string,
    expected: string,
  ) {
    const languageId = this.getLanguageId(language);

    try {
      const submitResponse = await axios.post(
        `${this.judge0BaseUrl}/submissions`,
        {
          source_code: code,
          language_id: languageId,
          stdin: input,
          expected_output: expected,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            base64_encoded: false,
            wait: true,
          },
        },
      );

      const submission = submitResponse.data;
      const output = submission.stdout || submission.stderr || '';
      const passed = submission.status?.id === 3;

      return {
        passed,
        output,
        error: submission.stderr || submission.compile_output || null,
      };
    } catch (error: any) {
      this.logger.error(`Judge0 error: ${error.message}`);

      return {
        passed: false,
        output: '',
        error: error.message || 'Unknown error',
      };
    }
  }
}
