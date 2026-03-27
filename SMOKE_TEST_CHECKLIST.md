# Smoke Test Checklist

## Accounts
Use three users with roles:
- admin
- teacher
- student

## Admin Flow
1. Login as admin and open `/admin`.
2. In LMS tab, create or verify at least one course.
3. Create or verify one group linked to that course.
4. Create or verify one category.
5. Create or edit one theme and assign a teacher.
6. Open users and assign the student to the created group.
7. Verify dashboard values load without errors.

Expected:
- All CRUD actions show success toast.
- Theme can be saved with teacher.
- Student has assigned group.

## Teacher Flow
1. Login as teacher and open `/teacher-lms` (or click `Мой LMS` in header).
2. Verify only own themes are shown.
3. Create assignment with:
   - type TEST
   - assigned own theme
   - group, category, startAt, deadline
4. Optional: delete and recreate assignment.
5. If there are student submissions, set manual score and save.
6. For TEST submission, run recalculate.
7. Create retake for a student.

Expected:
- Teacher can create/edit grade only for own theme assignments.
- No access to other teachers' assignment grading.

## Student Flow
1. Login as student and open `/lms`.
2. Select course and theme.
3. Open assignment details.
4. Start assignment, then submit:
   - TEST via answers
   - DOCUMENT via file upload (if document assignment exists)
5. Open `/grades` and verify grade appears/updates.

Expected:
- Student sees only assigned course/group content.
- Submission status changes correctly.

## Access Control Checks
1. Admin requests teacher-only endpoints should be blocked by role rules in UI flow.
2. Teacher should not access `/admin` panel.
3. Student should not access `/admin` and `/teacher-lms`.

Expected:
- Unauthorized pages show restricted message or redirect.

## Quick Regression UI
1. Verify dropdowns in:
   - Admin LMS
   - User list role select
   - Circle modal teacher select
   - Enrollment modal status select
   - Student LMS course select
2. Verify users panel height remains increased and does not clip controls.

Expected:
- Custom dropdown appears consistently and opens correctly near viewport edges.
