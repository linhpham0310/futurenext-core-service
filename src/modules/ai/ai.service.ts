// src/modules/ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async generateOutline(courseTitle: string, description?: string) {
    const prompt = `Tạo outline cho khóa học "${courseTitle}"${description ? ` với mô tả: ${description}` : ''}. 
  Trả về dạng JSON với cấu trúc: 
  [
    { "title": "Chương 1", "lessons": ["Bài 1", "Bài 2"] },
    { "title": "Chương 2", "lessons": ["Bài 3", "Bài 4"] }
  ]
  Giới hạn 5 chương, mỗi chương 2-4 bài học.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia thiết kế khóa học.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '[]';
    return JSON.parse(content);
  }

  async generateCourseOutline(courseTitle: string, description?: string) {
    const prompt = `Tạo outline cho khóa học "${courseTitle}"${description ? ` với mô tả: ${description}` : ''}. 
    Trả về dạng JSON với cấu trúc: 
    [
      { "title": "Chương 1", "lessons": ["Bài 1", "Bài 2"] },
      { "title": "Chương 2", "lessons": ["Bài 3", "Bài 4"] }
    ]
    Giới hạn 5 chương, mỗi chương 2-4 bài học.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia thiết kế khóa học.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '[]';
    return JSON.parse(content);
  }

  async generateQuizQuestions(
    topic: string,
    type: string,
    numQuestions: number,
  ) {
    const prompt = `Tạo ${numQuestions} câu hỏi ${type === 'ESSAY' ? 'tự luận' : 'trắc nghiệm'} về chủ đề "${topic}".
    Trả về JSON với cấu trúc:
    [
      {
        "text": "Câu hỏi?",
        "type": "MCQ",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": "A",
        "explanation": "Giải thích"
      }
    ]`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Bạn là giáo viên tạo câu hỏi kiểm tra.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content || '[]';
    return JSON.parse(content);
  }

  async getRecommendations(userId: string, enrolledCourses: any[]) {
    const prompt = `Dựa trên các khóa học đã đăng ký: ${enrolledCourses.map((c) => c.title).join(', ')}, 
    đề xuất 5 khóa học tiếp theo phù hợp. Trả về danh sách ID khóa học.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia tư vấn học tập.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '[]';
    return JSON.parse(content);
  }
}
