<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            // Độ chính xác micro giây để hai lần ghim liên tiếp không bị trùng thời điểm
            $table->timestamp('pinned_at', 6)->nullable()->after('content');
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropColumn('pinned_at');
        });
    }
};