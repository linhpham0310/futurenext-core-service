// src/modules/ai/ai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private ai: GoogleGenAI;
  private model: string;

  constructor(private configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('AI_API_KEY');

    this.model =
      this.configService.get<string>('AI_MODEL') || 'gemini-2.5-flash';

    this.ai = new GoogleGenAI({ apiKey });
  }

  private async generateJson(prompt: string): Promise<any> {
    this.logger.log('Mocking AI response (AI features disabled for local dev)');

    // Check if it's an outline request
    if (prompt.includes('Tạo outline')) {
      return [
        {
          title: 'Chương 1: Giới thiệu (Mock)',
          lessons: ['Bài 1: Tổng quan', 'Bài 2: Cài đặt'],
        },
        {
          title: 'Chương 2: Cơ bản (Mock)',
          lessons: ['Bài 3: Hello World', 'Bài 4: Biến và Kiểu dữ liệu'],
        },
      ];
    }
    // Check if it's a quiz request
    if (prompt.includes('tự luận') || prompt.includes('trắc nghiệm')) {
      const isEssay = prompt.includes('tự luận');
      return Array.from({ length: 3 }, (_, i) => ({
        text: `Câu hỏi mock số ${i + 1}`,
        type: isEssay ? 'ESSAY' : 'MCQ',
        options: isEssay ? undefined : ['A', 'B', 'C', 'D'],
        correctAnswer: isEssay ? undefined : 'A',
        explanation: 'Giải thích mock',
      }));
    }

    // Default mock response
    return [
      { courseTitle: 'Khóa học Mock 1' },
      { courseTitle: 'Khóa học Mock 2' },
    ];
  }

  async generateOutline(courseTitle: string, description?: string) {
    const prompt = `
Tạo outline cho khóa học "${courseTitle}"
${description ? `Mô tả: ${description}` : ''}

Trả về JSON đúng format:
[
  { "title": "Chương 1", "lessons": ["Bài 1", "Bài 2"] },
  { "title": "Chương 2", "lessons": ["Bài 3", "Bài 4"] }
]
Giới hạn 5 chương, mỗi chương 2-4 bài.
Chỉ trả về JSON, không giải thích.
`;
    return this.generateJson(prompt);
  }

  async generateCourseOutline(courseTitle: string, description?: string) {
    return this.generateOutline(courseTitle, description);
  }

  async generateQuizQuestions(
    topic: string,
    type: string,
    numQuestions: number,
  ) {
    try {
      const prompt = `
Tạo ${numQuestions} câu hỏi ${type === 'ESSAY' ? 'tự luận' : 'trắc nghiệm'} về chủ đề "${topic}".

JSON format:
[
  {
    "text": "Câu hỏi?",
    "type": "${type === 'ESSAY' ? 'ESSAY' : 'MCQ'}",
    "options": ${type === 'ESSAY' ? 'null' : '["A", "B", "C", "D"]'},
    "correctAnswer": "${type === 'ESSAY' ? 'null' : 'A'}",
    "explanation": "Giải thích"
  }
]

Chỉ trả về JSON.
`;
      return await this.generateJson(prompt);
    } catch (error: any) {
      // Fallback khi API lỗi (429, quota, network...)
      if (
        error.status === 429 ||
        error.message?.includes('RESOURCE_EXHAUSTED') ||
        error.message?.includes('quota')
      ) {
        this.logger.warn('Gemini API exhausted, using mock questions');
        return Array.from({ length: numQuestions }, (_, i) => ({
          text: `Mock question ${i + 1} about "${topic}"`,
          type: type === 'ESSAY' ? 'ESSAY' : 'MCQ',
          options: type === 'ESSAY' ? undefined : ['A', 'B', 'C', 'D'],
          correctAnswer: type === 'ESSAY' ? undefined : 'A',
          explanation: 'Mock explanation (API temporarily unavailable)',
        }));
      }
      throw error;
    }
  }

  async getRecommendations(userId: string, enrolledCourses: any[]) {
    const courses = enrolledCourses.map((c) => c.title).join(', ');
    const prompt = `
Người dùng đã học: ${courses}
Đề xuất 5 khóa học tiếp theo.
JSON format: [ { "courseTitle": "Tên khóa học" } ]
Chỉ trả về JSON.
`;
    return this.generateJson(prompt);
  }
}
