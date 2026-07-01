// src/modules/users/controllers/users.controller.ts
import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  Req,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole, UserStatus } from '../entities/user.entity';
import { UsersService } from '../services/users.service';
import { TeacherProfilesService } from '../services/teacher-profiles.service';
import { AuthService } from '../../auth/services/auth.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../../auth/dto/change-password.dto';
import {
  SubmitTeacherProfileDto,
  UpdateTeacherProfileDto,
} from '../dto/teacher-profile.dto';
import { GetTeacherProfilesFilterDto } from '../dto/admin-teacher-profile.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateUserFullDto } from '../dto/update-user-full.dto';
import { UpdateStudentStatusDto } from '../dto/update-student-status.dto';
import { CreateReviewDto } from '../dto/create-review.dto';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { TeacherProfileStatus } from '../entities/teacher-profile.entity';
import { CodeRunnerService } from '@/modules/code-runner/code-runner.service';
import { AiService } from '@/modules/ai/ai.service';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Response } from 'express';

// ==================== 1. USER CONTROLLER (Profile, self-management) ====================
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.findProfileById(userId);
  }

  @Put('me/profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  // Example admin-only test endpoint (có thể bỏ nếu không cần)
  @Get('admin/test')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminOnlyEndpoint(@CurrentUser() user: any) {
    return { message: `Welcome Admin ${user.sub}!` };
  }
}

// ==================== 2. ADMIN USER CONTROLLER (Quản lý người dùng) ====================
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  // Student management
  @Get('students')
  async getStudents(@Query() query: UserQueryDto) {
    return this.usersService.findStudents(query);
  }

  @Get('students/:id')
  async getStudentById(@Param('id') id: string) {
    return this.usersService.findStudentDetail(id);
  }

  @Patch('students/:id/status')
  async updateStudentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStudentStatusDto,
    @Req() req,
    @Ip() ip: string,
  ) {
    return this.usersService.updateStudentStatus(
      id,
      dto.status,
      req.user.sub,
      ip,
    );
  }

  @Put('students/:id')
  async updateStudent(
    @Param('id') id: string,
    @Body() dto: UpdateUserFullDto,
    @Req() req,
    @Ip() ip: string,
  ) {
    if (dto.role && dto.role !== UserRole.STUDENT) {
      throw new BadRequestException(
        'Không thể đổi role của học viên qua endpoint này',
      );
    }
    return this.usersService.updateUserFull(id, dto, req.user.sub, ip);
  }

  @Delete('students/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStudent(@Param('id') id: string, @Req() req, @Ip() ip: string) {
    await this.usersService.deleteUser(id, req.user.sub, ip);
  }

  @Get(':id/check-last-admin')
  async checkLastAdmin(
    @Param('id') userId: string,
    @Query('newRole') newRole: string,
  ) {
    if (newRole === UserRole.ADMIN) {
      return { isLastAdmin: false };
    }
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.ADMIN) {
      return { isLastAdmin: false };
    }
    const activeAdmins = await this.usersService.countActiveAdmins();
    const isLastAdmin = activeAdmins <= 1;
    return { isLastAdmin };
  }

  @Get(':id/audit-logs')
  async getUserAuditLogs(@Param('id') userId: string) {
    return this.usersService.getUserAuditLogs(userId);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  async triggerResetPassword(
    @Param('id') userId: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    await this.usersService.triggerResetPassword(userId, req.user.sub, ip);
    return {
      message: 'Link reset mật khẩu đã được gửi đến email của người dùng.',
    };
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.findProfileById(id);
  }

  @Put(':id/role')
  async updateUserRole(
    @Param('id') targetUserId: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const actionById = req.user.sub;
    await this.usersService.updateRole(
      targetUserId,
      updateRoleDto.role,
      actionById,
      ip,
    );
    return { message: 'Cập nhật vai trò người dùng thành công.' };
  }

  @Patch(':id')
  async updateUserPartial(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req,
    @Ip() ip: string,
  ) {
    return this.usersService.updateUserPartial(id, dto, req.user.sub, ip);
  }

  @Put(':id')
  async updateUserFull(
    @Param('id') id: string,
    @Body() dto: UpdateUserFullDto,
    @Req() req,
    @Ip() ip: string,
  ) {
    return this.usersService.updateUserFull(id, dto, req.user.sub, ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string, @Req() req, @Ip() ip: string) {
    await this.usersService.deleteUser(id, req.user.sub, ip);
  }
}

// ==================== 3. TEACHER PROFILES CONTROLLER (Nộp hồ sơ, xem profile) ====================
@Controller('teacher-profiles')
@UseGuards(JwtAuthGuard)
export class TeacherProfilesController {
  constructor(
    private readonly teacherProfilesService: TeacherProfilesService,
  ) {}

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  async submitProfile(@Request() req, @Body() dto: SubmitTeacherProfileDto) {
    const userId = req.user.sub;
    const profile = await this.teacherProfilesService.submitProfile(
      userId,
      dto,
    );
    return {
      success: true,
      message: 'Nộp hồ sơ giáo viên thành công',
      data: profile,
    };
  }

  @Put('update')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Request() req, @Body() dto: UpdateTeacherProfileDto) {
    const userId = req.user.sub;
    const profile = await this.teacherProfilesService.updateProfile(
      userId,
      dto,
    );
    return {
      success: true,
      message: 'Cập nhật hồ sơ giáo viên thành công',
      data: profile,
    };
  }

  @Get('my-profile')
  @HttpCode(HttpStatus.OK)
  async getMyProfile(@Request() req) {
    const userId = req.user.sub;
    const profile = await this.teacherProfilesService.findByUserId(userId);
    return { success: true, data: profile };
  }
}

// ==================== 4. ADMIN TEACHER PROFILES CONTROLLER (Duyệt hồ sơ) ====================
@Controller('admin/teacher-profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminTeacherProfilesController {
  constructor(
    private readonly teacherProfilesService: TeacherProfilesService,
  ) {}

  @Get()
  async getProfiles(@Query() filterDto: GetTeacherProfilesFilterDto) {
    const result = await this.teacherProfilesService.findAllForAdmin(filterDto);
    return {
      success: true,
      message: 'Lấy danh sách hồ sơ giáo viên thành công.',
      data: result,
    };
  }

  @Delete(':id')
  async deleteProfile(@Param('id') id: string, @Request() req) {
    const adminId = req.user.sub;
    return this.teacherProfilesService.deleteProfile(id, adminId);
  }

  @Patch(':id/approve')
  async approveProfile(@Param('id') id: string, @Request() req) {
    const result = await this.teacherProfilesService.reviewProfile(
      req.user.sub,
      id,
      {
        status: TeacherProfileStatus.APPROVED,
      },
    );
    return result;
  }

  @Patch(':id/reject')
  async rejectProfile(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    const result = await this.teacherProfilesService.reviewProfile(
      req.user.sub,
      id,
      {
        status: TeacherProfileStatus.REJECTED,
        reason,
      },
    );
    return result;
  }
}

// ==================== 5. STUDENT CONTROLLER (Học viên: profile, favorites, reviews, notifications) ====================
@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly codeRunnerService: CodeRunnerService,
    @InjectRedis() private readonly redis: Redis,
    private readonly aiService: AiService,
  ) {}

  // Profile & Password
  @Get('profile')
  async getProfile(@Request() req) {
    return this.usersService.findProfileById(req.user.sub);
  }

  @Put('profile')
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @Patch('change-password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto);
  }

  // Notifications
  @Get('notifications')
  async getNotifications(@Request() req, @Query('limit') limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  @Patch('notifications/:id/read')
  async markRead(@Param('id') id: string, @Request() req) {
    await this.prisma.notification.updateMany({
      where: { id, userId: req.user.sub },
      data: { isRead: true },
    });
    return { message: 'Marked as read' };
  }

  // ===== CART =====
  @Get('cart')
  async getCart(@Request() req) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId: req.user.sub },
      include: { course: true },
    });
    return items.map((item) => ({
      courseId: item.courseId,
      title: item.course.title,
      price: item.course.price,
      thumbnail: item.course.thumbnailUrl,
    }));
  }

  @Get('cart/summary')
  async getCartSummary(@Request() req) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId: req.user.sub },
      include: { course: true },
    });
    const total = items.reduce((sum, item) => sum + item.course.price, 0);
    return {
      items: items.map((item) => ({
        courseId: item.courseId,
        title: item.course.title,
        price: item.course.price,
      })),
      total,
    };
  }

  @Post('cart')
  async addToCart(@Request() req, @Body('courseId') courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    await this.prisma.cartItem.upsert({
      where: { userId_courseId: { userId: req.user.sub, courseId } },
      update: {},
      create: { userId: req.user.sub, courseId },
    });
    return { message: 'Added to cart' };
  }

  @Delete('cart/:courseId')
  async removeFromCart(@Param('courseId') courseId: string, @Request() req) {
    await this.prisma.cartItem.deleteMany({
      where: { userId: req.user.sub, courseId },
    });
    return { message: 'Removed from cart' };
  }

  // ===== ORDERS =====
  @Post('orders')
  async createOrder(
    @Request() req,
    @Body() body: { courseIds: string[]; paymentMethod: string },
  ) {
    const { courseIds, paymentMethod } = body;
    if (!courseIds || courseIds.length === 0) {
      throw new BadRequestException('Chưa chọn khóa học');
    }
    const userId = req.user.sub;
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds }, status: 'PUBLISHED' },
    });
    if (courses.length !== courseIds.length) {
      throw new BadRequestException(
        'Một số khóa học không tồn tại hoặc chưa xuất bản',
      );
    }
    const total = courses.reduce((sum, c) => sum + c.price, 0);
    // Tạo purchase (đơn hàng) với status PENDING
    const purchase = await this.prisma.purchase.create({
      data: {
        userId,
        courseId: courseIds[0], // Giả định chỉ mua 1 khóa học (nếu nhiều cần tạo nhiều purchase)
        amount: total,
        status: 'PENDING',
        purchasedAt: new Date(),
        paymentMethod,
      },
    });
    // TODO: Gọi service thanh toán để tạo payment URL
    const paymentUrl = null;
    // Giả định gọi Stripe, VNPay, QR
    if (paymentMethod === 'STRIPE') {
      // paymentUrl = await this.stripeService.createCheckoutSession(purchase.id, total);
    } else if (paymentMethod === 'VNPAY') {
      // paymentUrl = await this.vnpayService.createPaymentUrl(purchase.id, total);
    } else if (paymentMethod === 'QR') {
      // paymentUrl = await this.qrService.generateQR(purchase.id, total);
    }
    return { orderId: purchase.id, paymentUrl };
  }

  @Get('orders')
  async getMyOrders(@Request() req) {
    const orders = await this.prisma.purchase.findMany({
      where: { userId: req.user.sub },
      include: {
        course: { select: { title: true } },
      },
      orderBy: { purchasedAt: 'desc' },
    });
    return orders.map((o) => ({
      id: o.id,
      total: o.amount,
      status: o.status,
      createdAt: o.purchasedAt,
      items: [{ title: o.course.title }],
    }));
  }

  @Get('orders/:id')
  async getOrderDetail(@Param('id') id: string, @Request() req) {
    const order = await this.prisma.purchase.findUnique({
      where: { id, userId: req.user.sub },
      include: {
        course: true,
      },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }

  // ===== FAVORITES =====
  @Get('favorites')
  async getFavorites(@Request() req) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId: req.user.sub },
      include: { course: true },
    });
    return favorites.map((f) => f.course);
  }

  @Post('favorites/:courseId')
  async addFavorite(@Param('courseId') courseId: string, @Request() req) {
    await this.prisma.favorite.upsert({
      where: { userId_courseId: { userId: req.user.sub, courseId } },
      update: {},
      create: { userId: req.user.sub, courseId },
    });
    return { message: 'Added to favorites' };
  }

  @Delete('favorites/:courseId')
  async removeFavorite(@Param('courseId') courseId: string, @Request() req) {
    await this.prisma.favorite.deleteMany({
      where: { userId: req.user.sub, courseId },
    });
    return { message: 'Removed from favorites' };
  }

  // ===== REVIEWS =====
  @Get('reviews')
  async getMyReviews(@Request() req) {
    return this.prisma.review.findMany({
      where: { userId: req.user.sub },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('reviews')
  async createReview(@Request() req, @Body() dto: CreateReviewDto) {
    const purchase = await this.prisma.purchase.findUnique({
      where: {
        userId_courseId: { userId: req.user.sub, courseId: dto.courseId },
      },
    });
    if (!purchase)
      throw new ForbiddenException('Bạn chưa đăng ký khóa học này');
    return this.prisma.review.create({
      data: {
        userId: req.user.sub,
        courseId: dto.courseId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  @Put('reviews/:reviewId')
  async updateReview(
    @Param('reviewId') reviewId: string,
    @Request() req,
    @Body() dto: CreateReviewDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId, userId: req.user.sub },
    });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { rating: dto.rating, comment: dto.comment },
    });
  }

  @Delete('reviews/:reviewId')
  async deleteReview(@Param('reviewId') reviewId: string, @Request() req) {
    await this.prisma.review.deleteMany({
      where: { id: reviewId, userId: req.user.sub },
    });
    return { message: 'Review deleted' };
  }

  // ===== CERTIFICATES =====
  @Get('certificates')
  async getCertificates(@Request() req) {
    return this.prisma.certificate.findMany({
      where: { userId: req.user.sub },
      include: { course: { select: { title: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  @Get('certificates/:id/download')
  async downloadCertificate(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const cert = await this.prisma.certificate.findUnique({
      where: { id, userId: req.user.sub },
    });
    if (!cert) throw new NotFoundException('Không tìm thấy chứng chỉ');
    // Giả định certificateUrl là URL công khai
    const file = await fetch(cert.certificateUrl);
    const buffer = await file.arrayBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificate-${id}.pdf"`,
    );
    res.send(Buffer.from(buffer));
  }

  @Get('certificates/verify/:code')
  async verifyCertificate(@Param('code') code: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { id: code },
      include: { user: true, course: true },
    });
    if (!cert) throw new NotFoundException('Mã chứng chỉ không hợp lệ');
    return {
      isValid: true,
      studentName: cert.user.fullName,
      courseTitle: cert.course.title,
      issuedAt: cert.issuedAt,
    };
  }

  // ===== QUESTIONS =====
  @Get('questions')
  async getMyQuestions(@Request() req) {
    return this.prisma.question.findMany({
      where: { userId: req.user.sub },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('courses/:courseId/questions')
  async askQuestion(
    @Param('courseId') courseId: string,
    @Request() req,
    @Body('question') question: string,
  ) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId: req.user.sub, courseId } },
    });
    if (!purchase)
      throw new ForbiddenException('Bạn chưa đăng ký khóa học này');
    return this.prisma.question.create({
      data: {
        userId: req.user.sub,
        courseId,
        question,
      },
    });
  }

  // ===== LABS =====
  // src/modules/users/controllers/users.controller.ts
  @Get('labs/:lessonId')
  async getLab(@Param('lessonId') lessonId: string, @Request() req) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài lab');
    if (lesson.type !== 'LAB') {
      throw new BadRequestException('Bài học này không phải là lab');
    }
    const purchase = await this.prisma.purchase.findUnique({
      where: {
        userId_courseId: { userId: req.user.sub, courseId: lesson.courseId },
      },
    });
    if (!purchase)
      throw new ForbiddenException('Bạn chưa đăng ký khóa học này');

    const progress = await this.prisma.learningProgress.findUnique({
      where: { userId_lessonId: { userId: req.user.sub, lessonId } },
    });

    // Lấy test cases từ content_payload (giả định lưu trong content dạng JSON)
    let testCases = [];
    let initialCode = '';
    let language = 'javascript';
    try {
      const payload = JSON.parse(lesson.content || '{}');
      testCases = payload.testCases || [];
      initialCode = payload.initialCode || '';
      language = payload.language || 'javascript';
    } catch {
      // Nếu content không phải JSON, coi như không có test cases
    }

    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      instructions: lesson.instructions,
      initialCode,
      language,
      testCases,
      userProgress: progress || { status: 'NOT_STARTED', code: '' },
    };
  }

  @Post('labs/:lessonId/submit')
  async submitLab(
    @Param('lessonId') lessonId: string,
    @Request() req,
    @Body('code') code: string,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài lab');

    // Lấy test cases từ content
    let testCases = [];
    let language = 'javascript';
    try {
      const payload = JSON.parse(lesson.content || '{}');
      testCases = payload.testCases || [];
      language = payload.language || 'javascript';
    } catch {
      testCases = [];
    }

    // Gọi Code Runner Service (giả định có service)
    const result = await this.codeRunnerService.runCode({
      code,
      language,
      testCases,
    });

    // Cập nhật progress
    const status = result.passed ? 'COMPLETED' : 'IN_PROGRESS';
    await this.prisma.learningProgress.upsert({
      where: { userId_lessonId: { userId: req.user.sub, lessonId } },
      update: {
        status,
        metadata: { lastSubmittedCode: code, score: result.score },
      },
      create: {
        userId: req.user.sub,
        lessonId,
        courseId: lesson.courseId,
        status,
        lastPosition: 0,
        metadata: { lastSubmittedCode: code, score: result.score },
      },
    });

    return result;
  }

  // ===== RECOMMENDATIONS =====
  @Get('recommendations')
  async getRecommendations(@Request() req, @Query('refresh') refresh: string) {
    const userId = req.user.sub;
    const cacheKey = `recommendations:${userId}`;

    // Kiểm tra cache
    if (refresh !== 'true') {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Tính toán recommendations
    const purchases = await this.prisma.purchase.findMany({
      where: { userId, status: 'COMPLETED' },
      include: { course: true },
    });
    const enrolledCourses = purchases.map((p) => p.course);

    const recommendedIds = await this.aiService.getRecommendations(
      userId,
      enrolledCourses,
    );
    const courses = await this.prisma.course.findMany({
      where: { id: { in: recommendedIds }, status: 'PUBLISHED' },
      take: 10,
    });

    const result = courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      price: c.price,
      thumbnail: c.thumbnailUrl,
      reason: 'Gợi ý dựa trên sở thích học tập của bạn',
      matchScore: 85,
      category: 'Unknown',
    }));

    // Lưu cache 1 giờ
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
    return result;
  }

  @Post('recommendations/refresh')
  async refreshRecommendations(@Request() req) {
    // Gửi task async tạo gợi ý mới
    return { message: 'Đang làm mới gợi ý, vui lòng đợi...' };
  }

  @Get('questions/:questionId')
  async getQuestionDetail(
    @Param('questionId') questionId: string,
    @Request() req,
  ) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, userId: req.user.sub },
      include: { course: { select: { title: true } } },
    });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');
    return question;
  }
}
