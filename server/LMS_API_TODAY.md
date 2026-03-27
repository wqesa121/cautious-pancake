# LMS API (Current)

## Base
- Auth header: `Authorization: Bearer <token>`
- Base prefix in frontend: `/api`
- Upload folder is exposed by static route: `/uploads/<filename>`
- Allowed file formats: `.pdf .doc .docx .xls .xlsx .ppt .pptx`
- Max upload size: 20 MB

## Role model
- Admin manages structure and bindings (courses, groups, themes, categories, student/group, theme/teacher).
- Teacher manages assignments, test/document content, grading, and retakes only for own themes.
- Student sees assigned course/themes and submits work.

## Admin (requires role=admin)

### Users and teachers
- `GET /admin/users`
- `PUT /admin/users/:id` body can include: `{ "fullName", "email", "role", "group" }`
- `GET /admin/teachers`

### LMS structure
- `GET /admin/courses`
- `POST /admin/courses` body: `{ "title": "...", "description": "..." }`
- `PUT /admin/courses/:id`
- `DELETE /admin/courses/:id`

- `GET /admin/groups`
- `POST /admin/groups` body: `{ "name": "...", "course": "<courseId>" }`
- `PUT /admin/groups/:id`
- `DELETE /admin/groups/:id`

- `GET /admin/themes`
- `POST /admin/themes` body: `{ "title": "...", "description": "...", "course": "<courseId>", "teacher": "<teacherId|optional>" }`
- `PUT /admin/themes/:id` body can include `teacher`
- `DELETE /admin/themes/:id`

- `GET /admin/categories`
- `POST /admin/categories` body: `{ "name": "Лабораторная" }`
- `PUT /admin/categories/:id`
- `DELETE /admin/categories/:id`

### LMS dashboard
- `GET /admin/dashboard-lms`

### Deprecated for admin (returns 403 by design)
- `GET/POST/PUT/DELETE /admin/assignments*`
- `GET/PUT/POST /admin/grades*`
- `POST /admin/assignments/:assignmentId/retake/:studentId`

## Teacher LMS (requires role=teacher)

### Reference data
- `GET /teacher/lms/themes`
- `GET /teacher/lms/groups`
- `GET /teacher/lms/categories`

### Assignments
- `GET /teacher/lms/assignments`
- `POST /teacher/lms/assignments`
- `DELETE /teacher/lms/assignments/:id`

Assignment body example:
```json
{
  "theme": "<themeId>",
  "group": "<groupId>",
  "type": "TEST",
  "category": "<categoryId>",
  "title": "Тест по теме 1",
  "description": "...",
  "startAt": "2026-03-25T09:00:00.000Z",
  "deadline": "2026-03-30T20:00:00.000Z",
  "maxScore": 100,
  "isActive": true
}
```

### Assignment content
- `PUT /teacher/lms/assignments/:id/test` body: `{ "questions": [...] }`
- `POST /teacher/lms/assignments/:id/document` multipart field: `file`

Question example:
```json
{
  "text": "2+2=?",
  "allowMultiple": false,
  "options": [
    { "text": "3", "isCorrect": false },
    { "text": "4", "isCorrect": true }
  ]
}
```

### Grading
- `GET /teacher/lms/grades`
- `PUT /teacher/lms/grades/:id` body: `{ "manualScore": 88 }`
- `POST /teacher/lms/grades/:id/recalculate`

### Retake
- `POST /teacher/lms/assignments/:assignmentId/retake/:studentId`

## Student (requires role=student)
- `GET /student/courses`
- `GET /student/courses/:courseId/themes`
- `GET /student/themes/:themeId/assignments`
- `GET /student/assignments/:id`
- `POST /student/assignments/:id/start`
- `POST /student/assignments/:id/test-submit` body: `{ "answers": [...] }`
- `POST /student/assignments/:id/document-submit` multipart field: `file`
- `GET /student/grades`

Test answer example:
```json
{
  "answers": [
    {
      "questionId": "<questionObjectId>",
      "optionIndexes": [1]
    }
  ]
}
```

## Notes
- Test score is auto-calculated by exact match per question.
- Document assignments are submitted by student and graded by teacher.
- Student assignment statuses are derived as: `не начато`, `в процессе`, `выполнено`, `просрочено`.
