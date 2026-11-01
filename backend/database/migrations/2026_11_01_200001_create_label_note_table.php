<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bảng nối nhiều-nhiều; xóa nhãn hoặc ghi chú thì chỉ xóa dòng liên kết
        Schema::create('label_note', function (Blueprint $table) {
            $table->foreignId('label_id')->constrained()->cascadeOnDelete();
            $table->foreignId('note_id')->constrained()->cascadeOnDelete();
            $table->primary(['label_id', 'note_id']);
            $table->index('note_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('label_note');
    }
};