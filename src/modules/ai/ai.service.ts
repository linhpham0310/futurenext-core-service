// src/modules/ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private ai: GoogleGenAI;
  private model: string;

  constructor(private configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('AI_API_KEY');

    this.model =
      this.configService.get<string>('AI_MODEL') || 'gemini-2.5-flash';

    this.ai = new GoogleGenAI({
      apiKey,
    });
  }

  private async generateJson(prompt: string) {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
    });

    const text = response.text || '[]';

    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  }

  async generateOutline(courseTitle: string, description?: string) {
    const prompt = `
Tạo outline cho khóa học "${courseTitle}"
${description ? `Mô tả: ${description}` : ''}

Trả về JSON đúng format:

[
  {
    "title": "Chương 1",
    "lessons": ["Bài 1", "Bài 2"]
  },
  {
    "title": "Chương 2",
    "lessons": ["Bài 3", "Bài 4"]
  }
]

Giới hạn 5 chương.
Mỗi chương 2-4 bài.
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
    const prompt = `
Tạo ${numQuestions} câu hỏi về chủ đề "${topic}"

Loại câu hỏi:
${type === 'ESSAY' ? 'Tự luận' : 'Trắc nghiệm'}

JSON format:

[
  {
    "text": "Câu hỏi?",
    "type": "MCQ",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "Giải thích"
  }
]

Chỉ trả về JSON.
`;

    return this.generateJson(prompt);
  }

  async getRecommendations(userId: string, enrolledCourses: any[]) {
    const courses = enrolledCourses.map((c) => c.title).join(', ');

    const prompt = `
Người dùng đã học các khóa:

${courses}

Đề xuất 5 khóa học tiếp theo.

JSON format:

[
  {
    "courseTitle": "Tên khóa học"
  }
]

Chỉ trả về JSON.
`;

    return this.generateJson(prompt);
  }
}
