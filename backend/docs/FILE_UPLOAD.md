# Tính năng Gửi File - Chat App

## Tổng quan
Hệ thống chat đã được tích hợp tính năng gửi file với các tính năng:
- ✅ Upload file qua giao diện web
- ✅ Hiển thị preview file trong tin nhắn  
- ✅ Hỗ trợ nhiều loại file (ảnh, tài liệu, âm thanh, video)
- ✅ Giới hạn kích thước file (10MB)
- ✅ Authentication required
- ✅ File storage trên server

## Các loại file được hỗ trợ

### Hình ảnh
- `.jpg, .jpeg, .png, .gif, .webp`
- Hiển thị preview trực tiếp trong tin nhắn
- Click để xem full size

### Tài liệu
- `.pdf` - PDF documents
- `.doc, .docx` - Microsoft Word
- `.xls, .xlsx` - Microsoft Excel  
- `.ppt, .pptx` - Microsoft PowerPoint
- `.txt, .csv` - Text files

### Media
- `.mp3, .wav, .ogg` - Audio files
- `.mp4, .webm, .ogv` - Video files

### Archives
- `.zip, .rar, .7z` - Compressed files

## API Endpoints

### Upload File
```
POST /api/files/upload
Headers: Authorization: Bearer <token>
Body: FormData with 'file' field
```

Response:
```json
{
  "message": "File uploaded successfully",
  "file": {
    "filename": "1756142895123_example.jpg",
    "originalName": "example.jpg",
    "size": 1024576,
    "type": "image",
    "url": "/uploads/1756142895123_example.jpg",
    "uploadDate": "2025-08-26T..."
  }
}
```

### Get File Info
```
GET /api/files/info/:filename
```

### Delete File
```
DELETE /api/files/:filename
Headers: Authorization: Bearer <token>
```

### Download File
```
GET /uploads/:filename
```

## Cách sử dụng

### Từ giao diện web
1. Click nút đính kèm (📎) bên cạnh input tin nhắn
2. Chọn file từ máy tính (tối đa 10MB)
3. File sẽ hiển thị preview
4. Gửi tin nhắn (có thể kèm text)
5. File được upload và hiển thị trong tin nhắn

### Từ API
```javascript
// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();

// Gửi tin nhắn có file
const message = {
  message: "Tôi vừa gửi một file",
  file: result.file
};

socket.emit('send_message', message);
```

## Cấu trúc File Message

Tin nhắn có file sẽ có cấu trúc:
```json
{
  "id": 123,
  "userId": "socket_id",
  "username": "Tên user",
  "message": "Text message (optional)",
  "file": {
    "filename": "timestamp_filename.ext",
    "originalName": "original_filename.ext", 
    "size": 1024576,
    "type": "image|pdf|document|etc",
    "url": "/uploads/timestamp_filename.ext"
  },
  "timestamp": 1756142895123,
  "roomId": "room_name"
}
```

## Bảo mật

### Authentication
- Chỉ user đã đăng nhập mới được upload file
- JWT token required trong header

### File Validation
- Kiểm tra loại file qua MIME type
- Giới hạn kích thước 10MB
- Sanitize filename để tránh path traversal

### Storage
- File được lưu trong thư mục `uploads/`
- Filename được rename với timestamp để tránh conflict
- Serve qua static middleware của Express

## Hiển thị trong Chat

### File ảnh
- Hiển thị preview thumbnail
- Click để xem full size trong tab mới
- Responsive design

### File khác
- Hiển thị icon tương ứng với loại file
- Tên file và kích thước
- Click để download

### CSS Classes
```css
.file-message - Container cho file
.file-info - Thông tin file (icon + details)
.file-icon - Icon loại file
.file-details - Tên và kích thước file
.image-preview - Preview cho ảnh
.downloadable - Có thể click để download
```

## Socket.io Events

### Client → Server
```javascript
// Gửi tin nhắn có file
socket.emit('send_message', {
  message: 'Optional text',
  file: fileInfo
});

socket.emit('send_room_message', {
  roomId: 'room_name',
  message: 'Optional text', 
  file: fileInfo
});
```

### Server → Client
```javascript
// Nhận tin nhắn có file
socket.on('receive_message', (data) => {
  if (data.file) {
    // Tin nhắn có file
    console.log('File:', data.file);
  }
  if (data.message) {
    // Tin nhắn có text
    console.log('Message:', data.message);
  }
});
```

## Giới hạn và Lưu ý

### Kích thước file
- Tối đa 10MB per file
- Có thể cấu hình trong `middleware/upload.js`

### Performance
- File được serve trực tiếp từ server
- Không có CDN caching
- Phù hợp cho development và small scale

### Storage
- File lưu local trong `uploads/`
- Không có automatic cleanup
- Cần manual management cho production

## Troubleshooting

### Upload failed
- Kiểm tra file size < 10MB
- Kiểm tra loại file được hỗ trợ
- Kiểm tra JWT token hợp lệ

### File không hiển thị
- Kiểm tra file tồn tại trong `/uploads/`
- Kiểm tra URL path đúng
- Kiểm tra quyền đọc file

### Performance issues
- Resize ảnh trước upload
- Compress file nếu cần
- Consider cloud storage cho production

## Next Steps

### Improvements
- [ ] Image resize/compression
- [ ] Cloud storage integration (AWS S3, etc)
- [ ] File drag & drop
- [ ] Multiple file upload
- [ ] File progress indicator
- [ ] Virus scanning
- [ ] Auto cleanup old files
