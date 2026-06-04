/**
 * TASK LX-BE-1.1: Định nghĩa cấu trúc Metadata cho Progress
 */
export interface ProgressMetadata {
  lastSavedCode?: string; // Dành cho Lab
  selectedAnswers?: string[]; // Dành cho Quiz
  browserInfo?: string;
  playbackRate?: number; // Tốc độ xem video gần nhất
}
