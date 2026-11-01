# ID 25 — Share and Receive Notes (sau ID 23–24)

Dựa trên: `Web-Programing-Final-main (1).zip` **đã áp dụng** `Advanced_ID23_24_PasswordPatch.zip`.

## Bước 0: An toàn trước khi chép

- Mở repo đã `git clone`, không làm việc trên ZIP Download ZIP.
- Đảm bảo bạn đã làm xong ID 23–24. Kiểm tra có `backend/app/Services/NoteLockService.php` và `frontend/src/api/notePasswords.js`.
- `git status`; nếu có việc đang làm, commit/backup trước. Không ghi đè sửa đổi mới của thành viên khác.
- Tạo branch riêng (nếu chưa có): `git switch -c feature/advanced-note-management`.

## Bước 1: Chép toàn bộ 16 file vào thư mục project

Đặt `Advanced_ID25_SharingPatch.zip` ở thư mục gốc của repository (ngang `docker-compose.yml`). Trong Terminal PowerShell (đang ở thư mục gốc) chạy:

```powershell
Expand-Archive -LiteralPath .\Advanced_ID25_SharingPatch.zip -DestinationPath . -Force
```

Nếu muốn tự chép từng file: Tạo/sửa đúng đường dẫn như bảng dưới. File có sẵn thì **thay toàn bộ nội dung** bằng file trong patch, với điều kiện repo hiện tại đúng bản đã kiểm tra:

| Thao tác | File |
|---|---|
| TẠO | backend/database/migrations/2026_11_02_000000_create_note_shares_table.php |
| TẠO | backend/app/Models/NoteShare.php |
| TẠO | backend/app/Services/NoteAccessService.php |
| TẠO | backend/app/Services/NotePresenter.php |
| TẠO | backend/app/Http/Controllers/NoteShareController.php |
| TẠO | frontend/src/api/noteShares.js |
| TẠO | frontend/src/components/notes/ShareNoteModal.jsx |
| TẠO | backend/tests/Feature/NoteSharingTest.php |
| SỬA | backend/app/Models/Note.php |
| SỬA | backend/app/Http/Controllers/NoteController.php |
| SỬA | backend/app/Http/Controllers/NotePasswordController.php |
| SỬA | backend/routes/api.php |
| SỬA | frontend/src/components/notes/NoteEditorModal.jsx |
| SỬA | frontend/src/components/notes/NoteItem.jsx |
| SỬA | frontend/src/pages/NotesPage.jsx |
| SỬA | frontend/src/utils/notes.js |

## Bước 2: Build & chạy database

Đảm bảo Docker Desktop đang chạy. Tại thư mục gốc:

```powershell
docker compose up -d --build
docker compose ps
docker compose exec app php artisan migrate:status
```

Trong `migrate:status` tìm `2026_11_02_000000_create_note_shares_table` ở trạng thái `Ran`.
Nếu chưa Ran:

```powershell
docker compose exec app php artisan migrate --force
```

**Không chạy `docker compose down -v`** vì sẽ xóa dữ liệu MySQL trong volume.

## Bước 3: Kiểm tra route

```powershell
docker compose exec app php artisan route:list --path=api
```

Phải có `/api/shared-notes` và `/api/notes/{note}/shares` với GET, POST, PATCH, DELETE phù hợp. Các route `notes/{note}/password` của ID 23–24 vẫn phải còn.

## Bước 4: Kiểm thử bằng 2 tài khoản

Đăng nhập Alice (mật khẩu demo trong source). Mở một note đã có, chọn **Chia sẻ**, nhập `bob@example.com`, chọn `Read-only`, nhấn **Chia sẻ**.
Đăng xuất Alice, đăng nhập Bob. Chọn **Shared with Me**. Phải thấy thông báo ghi chú mới, chủ sở hữu, thời gian chia sẻ và quyền `Chỉ xem`. Mở note và kiểm tra không sửa được.

Quay về Alice, mở ghi chú, **Chia sẻ**, đổi Bob sang `Edit`. Đăng nhập Bob, mở ghi chú, sửa nội dung, đợi báo auto-save thành công. Alice phải đọc được nội dung Bob đã lưu (hiện ID25 chưa đồng bộ realtime; cần tải lại trang hoặc mở lại ghi chú).

Quay về Alice, chọn **Thu hồi**. Bob phải không còn thấy ghi chú và không gọi được API lấy/sửa nội dung.

## Bước 5: Kiểm tra ghi chú khóa

Alice đặt mật khẩu cho ghi chú, rồi chia sẻ cho Bob (Alice phải mở khóa trước khi chia sẻ). Bob phải nhập đúng mật khẩu ghi chú mới xem được nội dung. Không có mật khẩu, danh sách không được hiện preview.

**Chú ý:** Phần này không gửi mật khẩu tự động cho người nhận; owner cung cấp mật khẩu qua kênh thích hợp.

## Bước 6: Chạy kiểm thử PHP (nếu container có phpunit)

```powershell
docker compose exec app php artisan test --filter=NoteSharingTest
```

## Bước 7: Git

```powershell
git status
git add backend frontend
git commit -m "feat: implement note sharing and permissions"
git push -u origin feature/advanced-note-management
```

## Chức năng đã được cung cấp trong patch

- Chia sẻ cho 1 hoặc nhiều email tài khoản có sẵn, cùng mức quyền mỗi lượt.
- Danh sách người nhận, đổi quyền, thu hồi quyền.
- `Shared with Me` kèm owner, thời điểm chia sẻ, quyền và thông báo mới trong tài khoản.
- Backend kiểm soát owner / editor / viewer, gồm cả API PATCH và DELETE; vẫn kiểm tra mật khẩu nếu ghi chú bị khóa.
- Giữ nguyên editor dùng chung tạo/sửa, auto-save cũ; **chưa có WebSocket/đồng bộ đồng thời** (ID 26 là phần kế tiếp).

## Quan trọng

Chỉ dùng patch này **sau** patch ID23–24. Không chép trực tiếp từ ZIP vào repo nếu các thành viên khác đã chỉnh sửa các file trên sau thời điểm ZIP đầu vào được gửi; khi đó cần cherry-pick/merge thủ công để tránh mất công việc.
