<?php

namespace Database\Seeders;

use App\Models\Note;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'demo@notes.local'],
            ['name' => 'Demo', 'password' => 'password'], // cast 'hashed' sẽ băm bcrypt
        );

        if (Note::where('user_id', $user->id)->exists()) {
            return;
        }

        $samples = [
            ['Danh sách mua sắm', "Sữa tươi\nTrứng gà\nBánh mì\nRau cải"],
            ['Ý tưởng đồ án', 'Xây dựng ứng dụng ghi chú với Laravel và React, hỗ trợ chia sẻ và cộng tác thời gian thực qua WebSocket.'],
            ['Lịch họp nhóm', 'Thứ Hai 9h: chia việc. Thứ Năm 14h: review code. Chủ Nhật: demo nội bộ.'],
            ['Ghi chú ngắn', 'Nhớ nộp báo cáo.'],
            ['Công thức nấu ăn', 'Cá kho tộ: cá lóc, nước hàng, tiêu, hành tím, ớt. Kho lửa nhỏ khoảng 1 giờ cho thấm gia vị. '.str_repeat('Nêm nếm vừa ăn. ', 8)],
            ['Sách cần đọc', 'Clean Code, Refactoring, Designing Data-Intensive Applications.'],
            ['Học React', 'Hooks, context, memo, suspense. Ôn lại cách quản lý state và vòng đời effect.'],
            ['Kế hoạch tuần', 'Hoàn thành giao diện danh sách, kiểm thử trên điện thoại và máy tính bảng.'],
            ['Địa chỉ quán cà phê', 'Quán gần trường, có ổ cắm và wifi ổn định, phù hợp ngồi làm đồ án.'],
            ['Tài khoản demo', 'Dùng để thử nghiệm giao diện lưới và danh sách với nhiều độ dài nội dung khác nhau. '.str_repeat('Nội dung dài. ', 30)],
        ];

        foreach ($samples as $i => [$title, $content]) {
            $note = Note::create(['user_id' => $user->id, 'title' => $title, 'content' => $content]);
            // Giãn thời gian để thứ tự mới nhất lên đầu thấy rõ
            $note->forceFill(['updated_at' => now()->subHours(count($samples) - $i)])->saveQuietly();
        }
    }
}