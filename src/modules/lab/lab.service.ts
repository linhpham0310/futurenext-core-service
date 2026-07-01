import { Injectable } from '@nestjs/common';
import { VM } from 'vm2';

@Injectable()
export class LabService {
  async runCode(
    language: string,
    code: string,
    testCases: any[],
  ): Promise<any> {
    // Chỉ hỗ trợ JavaScript đơn giản
    if (language === 'javascript' || language === 'js') {
      const results: any[] = [];
      let passed = 0;
      for (const test of testCases) {
        try {
          const vm = new VM({
            timeout: 1000,
            sandbox: { input: test.input },
          });
          const output = vm.run(`
            ${code}
            const result = solution(input);
            result
          `);
          const isPassed = String(output) === String(test.expected);
          if (isPassed) passed++;
          results.push({
            testCase: test.description,
            passed: isPassed,
            output: String(output),
            expected: test.expected,
          });
        } catch (err) {
          results.push({
            testCase: test.description,
            passed: false,
            output: err.message,
            expected: test.expected,
          });
        }
      }
      return {
        passed: passed === testCases.length,
        score: (passed / testCases.length) * 100,
        totalTests: testCases.length,
        passedTests: passed,
        results,
        feedback:
          passed === testCases.length
            ? 'All tests passed!'
            : 'Some tests failed. Please try again.',
      };
    }
    // Các ngôn ngữ khác có thể gọi API bên ngoài (Judge0, etc.)
    return {
      passed: false,
      score: 0,
      totalTests: testCases.length,
      passedTests: 0,
      results: [],
      feedback: 'Ngôn ngữ chưa được hỗ trợ.',
    };
  }
}
