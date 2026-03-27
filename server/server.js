import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();
const port = Number(process.env.PORT) || 3001;
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/student_circles_db";

app.use((req, _res, next) => {
  if (req.url === "/api") {
    req.url = "/";
  } else if (req.url.startsWith("/api/")) {
    req.url = req.url.slice(4);
  }
  next();
});

app.use(express.json());
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const allowedExt = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"]);
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!allowedExt.has(ext)) {
      return cb(new Error("Недопустимый формат файла"));
    }
    cb(null, true);
  },
});

// Подключение к MongoDB
mongoose
  .connect(mongoUri)
  .then(() => console.log("✅ MongoDB подключена"))
  .catch((err) => console.error("❌ Ошибка MongoDB:", err));

const JWT_SECRET = process.env.JWT_SECRET || "pXT3UQ9xhdEXSQe3UXgQUaumsJzxcf10gGSVf5xZ51rVPYu6ha";

// ────────────────────────────────────────────────
// МОДЕЛИ
// ────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
    role: { type: String, enum: ["student", "admin"], default: "student" },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model("User", userSchema);

const circleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: { type: String, trim: true },
  maxPlaces: { type: Number, required: true, min: 1 },
  currentPlaces: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  schedule: { type: String, trim: true },
  imageUrl: { type: String },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const Circle = mongoose.model("Circle", circleSchema);

const messageSchema = new mongoose.Schema({
  circle: { type: mongoose.Schema.Types.ObjectId, ref: "Circle", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ circle: 1, createdAt: 1 });
const Message = mongoose.model("Message", messageSchema);

const userCircleLastReadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  circle: { type: mongoose.Schema.Types.ObjectId, ref: "Circle", required: true },
  lastReadAt: { type: Date, default: Date.now },
}, { timestamps: true });
userCircleLastReadSchema.index({ user: 1, circle: 1 }, { unique: true });
const UserCircleLastRead = mongoose.model("UserCircleLastRead", userCircleLastReadSchema);

const enrollmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  circle: { type: mongoose.Schema.Types.ObjectId, ref: "Circle", required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "cancelled"],
    default: "pending",
  },
  comment: { type: String, trim: true },
  rejectionReason: { type: String, trim: true },
  rejectedAs: { type: String, enum: ["application", "removed_from_circle"] },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

enrollmentSchema.index({ user: 1, circle: 1 }, { unique: true });

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});
const Course = mongoose.model("Course", courseSchema);

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  createdAt: { type: Date, default: Date.now },
});
const Group = mongoose.model("Group", groupSchema);

const themeSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});
const Theme = mongoose.model("Theme", themeSchema);

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});
const Category = mongoose.model("Category", categorySchema);

const assignmentSchema = new mongoose.Schema({
  theme: { type: mongoose.Schema.Types.ObjectId, ref: "Theme", required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  type: { type: String, enum: ["TEST", "DOCUMENT"], required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  startAt: { type: Date, required: true },
  deadline: { type: Date, required: true },
  maxScore: { type: Number, default: 100, min: 1, max: 100 },
  documentFile: { type: String },
  questions: [
    {
      text: { type: String, required: true },
      image: { type: String },
      allowMultiple: { type: Boolean, default: false },
      options: [
        {
          text: { type: String, required: true },
          isCorrect: { type: Boolean, default: false },
        },
      ],
    },
  ],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
assignmentSchema.index({ theme: 1, group: 1, deadline: 1 });
const Assignment = mongoose.model("Assignment", assignmentSchema);

const submissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
  attempt: { type: Number, required: true, default: 1 },
  status: {
    type: String,
    enum: ["in_progress", "submitted", "graded", "overdue"],
    default: "in_progress",
  },
  answers: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
      optionIndexes: [{ type: Number, required: true }],
    },
  ],
  file: { type: String },
  autoScore: { type: Number, default: 0 },
  manualScore: { type: Number },
  finalScore: { type: Number, default: 0 },
  submittedAt: { type: Date },
  gradedAt: { type: Date },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reopenedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
submissionSchema.index({ student: 1, assignment: 1, attempt: 1 }, { unique: true });
const Submission = mongoose.model("Submission", submissionSchema);

// ────────────────────────────────────────────────
// MIDDLEWARE
// ────────────────────────────────────────────────

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Токен отсутствует" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(401).json({ message: "Пользователь не найден" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Недействительный токен" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Доступ только для администратора" });
  }
  next();
};

const studentOnly = (req, res, next) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Доступ только для студента" });
  }
  next();
};

const teacherOnly = (req, res, next) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({ message: "Доступ только для преподавателя" });
  }
  next();
};

const isAfterDeadline = (assignment) => {
  const now = new Date();
  return new Date(assignment.deadline).getTime() < now.getTime();
};

const normalizeIndexes = (arr = []) => [...new Set(arr)].sort((a, b) => a - b);

const calculateTestScore = (assignment, answers = []) => {
  const questions = assignment.questions || [];
  if (questions.length === 0) {
    return 0;
  }

  let correctCount = 0;
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const expected = normalizeIndexes(
      (q.options || [])
        .map((opt, idx) => ({ idx, isCorrect: !!opt.isCorrect }))
        .filter((v) => v.isCorrect)
        .map((v) => v.idx)
    );

    const answer = answers.find((a) => String(a.questionId) === String(q._id));
    const selected = normalizeIndexes(answer?.optionIndexes || []);
    const isCorrect = expected.length === selected.length && expected.every((v, idx) => v === selected[idx]);
    if (isCorrect) {
      correctCount += 1;
    }
  }

  const score = Math.round((correctCount / questions.length) * assignment.maxScore);
  return Math.max(0, Math.min(assignment.maxScore, score));
};

// ────────────────────────────────────────────────
// РОУТЫ
// ────────────────────────────────────────────────

// Регистрация — исправленная версия
app.post("/register", async (req, res) => {
  try {
    let { username, password, fullName, phone, email } = req.body;

    // Логируем ВСЁ, что пришло с фронта — это важно для отладки!
    console.log("ЗАПРОС /register → тело:", req.body);

    // Жёсткая проверка обязательных полей
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return res.status(400).json({ message: "Поле username обязательно и не может быть пустым" });
    }
    if (!password || password.trim() === '') {
      return res.status(400).json({ message: "Пароль обязателен" });
    }
    if (!fullName || fullName.trim() === '') {
      return res.status(400).json({ message: "ФИО обязательно" });
    }

    // Нормализация username и email
    username = username.trim().toLowerCase();
    if (email) email = email.trim().toLowerCase();

    // Проверка уникальности без учёта регистра и пробелов
    const existByUsername = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    const existByEmail = email ? await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    }) : null;

    if (existByUsername || existByEmail) {
      console.log("Дубликат найден:", existByUsername?.username || existByEmail?.email);
      return res.status(409).json({ message: "Пользователь с таким логином или email уже существует" });
    }

    const user = new User({
      username,
      password,
      fullName,
      phone,
      email,
    });

    await user.save();

    console.log("Успешно создан пользователь:", username);
    res.status(201).json({ message: "Регистрация прошла успешно" });
  } catch (err) {
    console.error("ОШИБКА РЕГИСТРАЦИИ:", err);
    res.status(500).json({ message: "Ошибка сервера при регистрации" });
  }
});

// Вход (тоже нормализуем username)
app.post("/login", async (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Логин и пароль обязательны" });
    }

    username = username.trim().toLowerCase();

    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Неверный логин или пароль" });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Ошибка входа:", err);
    res.status(500).json({ message: "Ошибка входа" });
  }
});

// Обновление профиля
app.put("/profile", authenticate, async (req, res) => {
  try {
    const { fullName, phone, email, password } = req.body;
    const updates = {};

    if (fullName) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (email) {
      const exist = await User.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: req.user._id },
      });
      if (exist) return res.status(409).json({ message: "Email уже используется" });
      updates.email = email.trim().toLowerCase();
    }
    if (password) updates.password = password;

    const updated = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({ message: "Профиль обновлён", user: updated });
  } catch (err) {
    console.error("Ошибка обновления профиля:", err);
    res.status(500).json({ message: "Ошибка обновления профиля" });
  }
});

// ──── Студент ────

app.get("/circles", async (req, res) => {
  try {
    const circles = await Circle.find({ isActive: true }).select("-__v -createdAt");
    res.json(circles);
  } catch (err) {
    console.error("Ошибка /circles:", err);
    res.status(500).json({ message: "Не удалось загрузить кружки" });
  }
});

// Сообщения чата кружка (доступ: студент с одобренной заявкой, преподаватель кружка, админ)
app.get("/circles/:id/messages", authenticate, async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) return res.status(404).json({ message: "Кружок не найден" });

    const isAdmin = req.user.role === "admin";
    const isTeacher = circle.teacher && circle.teacher.toString() === req.user._id.toString();
    const isEnrolled = await Enrollment.findOne({
      user: req.user._id,
      circle: req.params.id,
      status: "approved",
    });
    if (!isAdmin && !isTeacher && !isEnrolled) {
      return res.status(403).json({ message: "Нет доступа к чату этого кружка" });
    }

    const messages = await Message.find({ circle: req.params.id })
      .populate("user", "fullName username")
      .sort({ createdAt: 1 })
      .lean();
    const latest = messages.length > 0 ? messages[messages.length - 1].createdAt : null;
    if (latest) {
      await UserCircleLastRead.findOneAndUpdate(
        { user: req.user._id, circle: req.params.id },
        { lastReadAt: latest },
        { upsert: true }
      );
    }
    res.json(messages);
  } catch (err) {
    console.error("Ошибка /circles/:id/messages:", err);
    res.status(500).json({ message: "Ошибка загрузки сообщений" });
  }
});

// Отправить сообщение в чат кружка (только преподаватель кружка или админ)
app.post("/circles/:id/messages", authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "Текст сообщения обязателен" });
    }

    const circle = await Circle.findById(req.params.id);
    if (!circle) return res.status(404).json({ message: "Кружок не найден" });

    const isAdmin = req.user.role === "admin";
    const isTeacher = circle.teacher && circle.teacher.toString() === req.user._id.toString();
    if (!isAdmin && !isTeacher) {
      return res.status(403).json({ message: "Только преподаватель кружка может писать в чат" });
    }

    const message = await Message.create({
      circle: req.params.id,
      user: req.user._id,
      content: content.trim(),
    });
    const populated = await Message.findById(message._id)
      .populate("user", "fullName username")
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    console.error("Ошибка POST /circles/:id/messages:", err);
    res.status(500).json({ message: "Ошибка отправки сообщения" });
  }
});

app.get("/circles/:id", async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id).populate("teacher", "fullName username");
    if (!circle) return res.status(404).json({ message: "Кружок не найден" });
    res.json(circle);
  } catch (err) {
    console.error("Ошибка /circles/:id:", err);
    res.status(500).json({ message: "Ошибка" });
  }
});

app.post("/enroll", authenticate, async (req, res) => {
  try {
    const { circleId, comment } = req.body;

    const circle = await Circle.findById(circleId);
    if (!circle || !circle.isActive) {
      return res.status(404).json({ message: "Кружок не найден или закрыт" });
    }

    if (circle.currentPlaces >= circle.maxPlaces) {
      return res.status(409).json({ message: "Все места заняты" });
    }

    const existing = await Enrollment.findOne({ user: req.user._id, circle: circleId });
    if (existing) {
      if (existing.status === "approved" || existing.status === "pending") {
        return res.status(409).json({ message: "Вы уже записаны на этот кружок или заявка на рассмотрении" });
      }
      existing.status = "pending";
      existing.comment = comment;
      existing.rejectionReason = undefined;
      await existing.save();
      return res.status(201).json({ message: "Заявка отправлена повторно", enrollment: existing });
    }

    const enrollment = await Enrollment.create({
      user: req.user._id,
      circle: circleId,
      comment,
    });

    res.status(201).json({ message: "Заявка отправлена", enrollment });
  } catch (err) {
    console.error("Ошибка /enroll:", err);
    res.status(500).json({ message: "Ошибка при записи" });
  }
});

app.get("/my-enrollments", authenticate, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user._id })
      .populate("circle", "title category schedule price currentPlaces maxPlaces teacher")
      .select("-__v -updatedAt")
      .lean();
    const result = [];
    for (const enr of enrollments) {
      const item = { ...enr, circle: enr.circle, unreadCount: 0 };
      if (enr.status === "approved" && enr.circle && enr.circle._id) {
        const lastRead = await UserCircleLastRead.findOne({
          user: req.user._id,
          circle: enr.circle._id,
        });
        const since = lastRead ? lastRead.lastReadAt : new Date(0);
        const unreadCount = await Message.countDocuments({
          circle: enr.circle._id,
          createdAt: { $gt: since },
        });
        item.unreadCount = unreadCount;
      }
      result.push(item);
    }
    res.json(result);
  } catch (err) {
    console.error("Ошибка /my-enrollments:", err);
    res.status(500).json({ message: "Не удалось загрузить ваши записи" });
  }
});

// Удалить свою запись (только отклонённую или отменённую)
app.delete("/my-enrollments/:id", authenticate, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: "Запись не найдена" });
    if (enrollment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Можно удалить только свою запись" });
    }
    if (!["rejected", "cancelled"].includes(enrollment.status)) {
      return res.status(400).json({ message: "Удалить можно только отклонённую или отменённую запись" });
    }
    await Enrollment.findByIdAndDelete(req.params.id);
    res.json({ message: "Запись удалена" });
  } catch (err) {
    console.error("Ошибка удаления записи:", err);
    res.status(500).json({ message: "Не удалось удалить запись" });
  }
});

// Кружки, которые ведёт преподаватель (для роли teacher)
app.get("/teacher/circles", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Доступ только для преподавателя" });
    }
    const query = req.user.role === "admin"
      ? {}
      : { teacher: req.user._id };
    const circles = await Circle.find(query)
      .select("title category schedule currentPlaces maxPlaces")
      .sort({ title: 1 })
      .lean();
    res.json(circles);
  } catch (err) {
    console.error("Ошибка /teacher/circles:", err);
    res.status(500).json({ message: "Ошибка загрузки кружков" });
  }
});

// Заявки на кружки преподавателя (только свои кружки для teacher, все для admin)
app.get("/teacher/enrollments", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Доступ только для преподавателя" });
    }
    const circleQuery = req.user.role === "admin" ? {} : { teacher: req.user._id };
    const circleIds = await Circle.find(circleQuery).distinct("_id");
    const enrollments = await Enrollment.find({ circle: { $in: circleIds } })
      .populate("user", "username fullName phone email")
      .populate("circle", "title category")
      .sort({ createdAt: -1 })
      .select("-__v -updatedAt");
    res.json(enrollments);
  } catch (err) {
    console.error("Ошибка /teacher/enrollments:", err);
    res.status(500).json({ message: "Ошибка загрузки заявок" });
  }
});

// Изменение статуса заявки преподавателем (только для заявок на свои кружки)
app.put("/teacher/enrollments/:id/status", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Доступ только для преподавателя" });
    }
    const { status, rejectionReason } = req.body;
    if (!["approved", "rejected", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Недопустимый статус" });
    }

    const enrollment = await Enrollment.findById(req.params.id).populate("circle");
    if (!enrollment) return res.status(404).json({ message: "Заявка не найдена" });

    const circle = await Circle.findById(enrollment.circle._id || enrollment.circle);
    if (!circle) return res.status(404).json({ message: "Кружок не найден" });
    const isMyCircle = req.user.role === "admin" || circle.teacher?.toString() === req.user._id.toString();
    if (!isMyCircle) {
      return res.status(403).json({ message: "Вы можете менять только заявки на свои кружки" });
    }

    const prevStatus = enrollment.status;
    enrollment.rejectionReason = status === "rejected" && rejectionReason ? rejectionReason.trim() : undefined;
    enrollment.rejectedAs = status === "rejected" ? (prevStatus === "approved" ? "removed_from_circle" : "application") : undefined;

    if (status === "approved" && prevStatus !== "approved") {
      const updated = await Circle.findOneAndUpdate(
        { _id: enrollment.circle._id || enrollment.circle, $expr: { $lt: ["$currentPlaces", "$maxPlaces"] } },
        { $inc: { currentPlaces: 1 } },
        { new: true }
      );
      if (!updated) {
        return res.status(409).json({ message: "Нет свободных мест в кружке" });
      }
    }

    if (prevStatus === "approved" && status !== "approved") {
      await Circle.findOneAndUpdate(
        { _id: enrollment.circle._id || enrollment.circle },
        [{ $set: { currentPlaces: { $max: [0, { $subtract: ["$currentPlaces", 1] }] } } }]
      );
    }

    enrollment.status = status;
    await enrollment.save();

    res.json({ message: `Статус изменён → ${status}`, enrollment });
  } catch (err) {
    console.error("Ошибка изменения статуса заявки (teacher):", err);
    res.status(500).json({ message: "Ошибка изменения статуса" });
  }
});

// ──── Админ ────

app.use("/admin", authenticate, adminOnly);

// ──── LMS (админ) ────

app.get("/admin/courses", async (_req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    console.error("Ошибка загрузки курсов:", err);
    res.status(500).json({ message: "Ошибка загрузки курсов" });
  }
});

app.post("/admin/courses", async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Название курса обязательно" });
    const course = await Course.create({ title: title.trim(), description });
    res.status(201).json({ message: "Курс создан", course });
  } catch (err) {
    console.error("Ошибка создания курса:", err);
    res.status(500).json({ message: "Ошибка создания курса" });
  }
});

app.put("/admin/courses/:id", async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Курс не найден" });
    res.json({ message: "Курс обновлён", course: updated });
  } catch (err) {
    console.error("Ошибка обновления курса:", err);
    res.status(500).json({ message: "Ошибка обновления курса" });
  }
});

app.delete("/admin/courses/:id", async (req, res) => {
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Курс не найден" });
    await Theme.deleteMany({ course: req.params.id });
    await Group.deleteMany({ course: req.params.id });
    res.json({ message: "Курс удалён" });
  } catch (err) {
    console.error("Ошибка удаления курса:", err);
    res.status(500).json({ message: "Ошибка удаления курса" });
  }
});

app.get("/admin/groups", async (_req, res) => {
  try {
    const groups = await Group.find().populate("course", "title").sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) {
    console.error("Ошибка загрузки групп:", err);
    res.status(500).json({ message: "Ошибка загрузки групп" });
  }
});

app.post("/admin/groups", async (req, res) => {
  try {
    const { name, course } = req.body;
    if (!name?.trim() || !course) return res.status(400).json({ message: "name и course обязательны" });
    const created = await Group.create({ name: name.trim(), course });
    res.status(201).json({ message: "Группа создана", group: created });
  } catch (err) {
    console.error("Ошибка создания группы:", err);
    res.status(500).json({ message: "Ошибка создания группы" });
  }
});

app.put("/admin/groups/:id", async (req, res) => {
  try {
    const updated = await Group.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Группа не найдена" });
    res.json({ message: "Группа обновлена", group: updated });
  } catch (err) {
    console.error("Ошибка обновления группы:", err);
    res.status(500).json({ message: "Ошибка обновления группы" });
  }
});

app.delete("/admin/groups/:id", async (req, res) => {
  try {
    const deleted = await Group.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Группа не найдена" });
    res.json({ message: "Группа удалена" });
  } catch (err) {
    console.error("Ошибка удаления группы:", err);
    res.status(500).json({ message: "Ошибка удаления группы" });
  }
});

app.get("/admin/themes", async (_req, res) => {
  try {
    const themes = await Theme.find()
      .populate("course", "title")
      .populate("teacher", "fullName username")
      .sort({ createdAt: -1 });
    res.json(themes);
  } catch (err) {
    console.error("Ошибка загрузки тем:", err);
    res.status(500).json({ message: "Ошибка загрузки тем" });
  }
});

app.post("/admin/themes", async (req, res) => {
  try {
    const { title, description, course, teacher } = req.body;
    if (!title?.trim() || !course) return res.status(400).json({ message: "title и course обязательны" });
    if (teacher) {
      const teacherUser = await User.findById(teacher);
      if (!teacherUser || teacherUser.role !== "teacher") {
        return res.status(400).json({ message: "Указан некорректный преподаватель" });
      }
    }
    const created = await Theme.create({ title: title.trim(), description, course, teacher: teacher || null });
    res.status(201).json({ message: "Тема создана", theme: created });
  } catch (err) {
    console.error("Ошибка создания темы:", err);
    res.status(500).json({ message: "Ошибка создания темы" });
  }
});

app.put("/admin/themes/:id", async (req, res) => {
  try {
    if (req.body.teacher) {
      const teacherUser = await User.findById(req.body.teacher);
      if (!teacherUser || teacherUser.role !== "teacher") {
        return res.status(400).json({ message: "Указан некорректный преподаватель" });
      }
    }
    const updated = await Theme.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Тема не найдена" });
    res.json({ message: "Тема обновлена", theme: updated });
  } catch (err) {
    console.error("Ошибка обновления темы:", err);
    res.status(500).json({ message: "Ошибка обновления темы" });
  }
});

app.delete("/admin/themes/:id", async (req, res) => {
  try {
    const deleted = await Theme.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Тема не найдена" });
    await Assignment.deleteMany({ theme: req.params.id });
    res.json({ message: "Тема удалена" });
  } catch (err) {
    console.error("Ошибка удаления темы:", err);
    res.status(500).json({ message: "Ошибка удаления темы" });
  }
});

app.get("/admin/categories", async (_req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error("Ошибка загрузки категорий:", err);
    res.status(500).json({ message: "Ошибка загрузки категорий" });
  }
});

app.post("/admin/categories", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Название категории обязательно" });
    const created = await Category.create({ name: name.trim() });
    res.status(201).json({ message: "Категория создана", category: created });
  } catch (err) {
    console.error("Ошибка создания категории:", err);
    res.status(500).json({ message: "Ошибка создания категории" });
  }
});

app.put("/admin/categories/:id", async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Категория не найдена" });
    res.json({ message: "Категория обновлена", category: updated });
  } catch (err) {
    console.error("Ошибка обновления категории:", err);
    res.status(500).json({ message: "Ошибка обновления категории" });
  }
});

app.delete("/admin/categories/:id", async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Категория не найдена" });
    res.json({ message: "Категория удалена" });
  } catch (err) {
    console.error("Ошибка удаления категории:", err);
    res.status(500).json({ message: "Ошибка удаления категории" });
  }
});

app.get("/admin/assignments", async (_req, res) => {
  return res.status(403).json({ message: "Заданиями управляет преподаватель" });
});

app.post("/admin/assignments", async (req, res) => {
  return res.status(403).json({ message: "Задания создаёт преподаватель" });
});

app.put("/admin/assignments/:id", async (req, res) => {
  return res.status(403).json({ message: "Заданиями управляет преподаватель" });
});

app.delete("/admin/assignments/:id", async (req, res) => {
  return res.status(403).json({ message: "Заданиями управляет преподаватель" });
});

app.post("/admin/assignments/:id/document", upload.single("file"), async (req, res) => {
  return res.status(403).json({ message: "Файлом задания управляет преподаватель" });
});

app.put("/admin/assignments/:id/test", async (req, res) => {
  return res.status(403).json({ message: "Тестом управляет преподаватель" });
});

app.get("/admin/grades", async (_req, res) => {
  return res.status(403).json({ message: "Оценки выставляет преподаватель" });
});

app.put("/admin/grades/:id", async (req, res) => {
  return res.status(403).json({ message: "Оценки выставляет преподаватель" });
});

app.post("/admin/grades/:id/recalculate", async (req, res) => {
  return res.status(403).json({ message: "Оценки пересчитывает преподаватель" });
});

app.post("/admin/assignments/:assignmentId/retake/:studentId", async (req, res) => {
  return res.status(403).json({ message: "Повторную попытку назначает преподаватель" });
});

// ──── LMS (преподаватель) ────

app.get("/teacher/lms/themes", authenticate, teacherOnly, async (req, res) => {
  try {
    const themes = await Theme.find({ teacher: req.user._id })
      .populate("course", "title")
      .sort({ createdAt: -1 });
    res.json(themes);
  } catch (err) {
    console.error("Ошибка загрузки тем преподавателя:", err);
    res.status(500).json({ message: "Ошибка загрузки тем" });
  }
});

app.get("/teacher/lms/groups", authenticate, teacherOnly, async (req, res) => {
  try {
    const teacherCourses = await Theme.find({ teacher: req.user._id }).distinct("course");
    const groups = await Group.find({ course: { $in: teacherCourses } })
      .populate("course", "title")
      .sort({ name: 1 });
    res.json(groups);
  } catch (err) {
    console.error("Ошибка загрузки групп преподавателя:", err);
    res.status(500).json({ message: "Ошибка загрузки групп" });
  }
});

app.get("/teacher/lms/categories", authenticate, teacherOnly, async (_req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error("Ошибка загрузки категорий для преподавателя:", err);
    res.status(500).json({ message: "Ошибка загрузки категорий" });
  }
});

app.get("/teacher/lms/assignments", authenticate, teacherOnly, async (req, res) => {
  try {
    const teacherThemeIds = await Theme.find({ teacher: req.user._id }).distinct("_id");
    const assignments = await Assignment.find({ theme: { $in: teacherThemeIds } })
      .populate("theme", "title")
      .populate("group", "name")
      .populate("category", "name")
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    console.error("Ошибка загрузки заданий преподавателя:", err);
    res.status(500).json({ message: "Ошибка загрузки заданий" });
  }
});

app.post("/teacher/lms/assignments", authenticate, teacherOnly, async (req, res) => {
  try {
    const { theme } = req.body;
    const themeDoc = await Theme.findById(theme);
    if (!themeDoc) return res.status(404).json({ message: "Тема не найдена" });
    if (String(themeDoc.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: "Можно создавать задания только по своим темам" });
    }
    const created = await Assignment.create(req.body);
    res.status(201).json({ message: "Задание создано", assignment: created });
  } catch (err) {
    console.error("Ошибка создания задания преподавателем:", err);
    res.status(500).json({ message: "Ошибка создания задания" });
  }
});

app.delete("/teacher/lms/assignments/:id", authenticate, teacherOnly, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate("theme", "teacher");
    if (!assignment) return res.status(404).json({ message: "Задание не найдено" });
    if (String(assignment.theme.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: "Можно удалять только свои задания" });
    }
    await Assignment.findByIdAndDelete(req.params.id);
    await Submission.deleteMany({ assignment: req.params.id });
    res.json({ message: "Задание удалено" });
  } catch (err) {
    console.error("Ошибка удаления задания преподавателем:", err);
    res.status(500).json({ message: "Ошибка удаления задания" });
  }
});

app.put("/teacher/lms/assignments/:id/test", authenticate, teacherOnly, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate("theme", "teacher");
    if (!assignment) return res.status(404).json({ message: "Задание не найдено" });
    if (assignment.type !== "TEST") return res.status(400).json({ message: "Это не тест" });
    if (String(assignment.theme.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: "Можно редактировать только свои тесты" });
    }
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Нужен массив вопросов" });
    }
    assignment.questions = questions;
    await assignment.save();
    res.json({ message: "Тест обновлён", assignment });
  } catch (err) {
    console.error("Ошибка обновления теста преподавателем:", err);
    res.status(500).json({ message: "Ошибка обновления теста" });
  }
});

app.post("/teacher/lms/assignments/:id/document", authenticate, teacherOnly, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Файл обязателен" });
    const assignment = await Assignment.findById(req.params.id).populate("theme", "teacher");
    if (!assignment) return res.status(404).json({ message: "Задание не найдено" });
    if (assignment.type !== "DOCUMENT") return res.status(400).json({ message: "Это не документное задание" });
    if (String(assignment.theme.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: "Можно обновлять файл только своего задания" });
    }
    assignment.documentFile = `/uploads/${req.file.filename}`;
    await assignment.save();
    res.json({ message: "Файл задания загружен", assignment });
  } catch (err) {
    console.error("Ошибка загрузки файла задания преподавателем:", err);
    res.status(500).json({ message: "Ошибка загрузки файла" });
  }
});

app.get("/teacher/lms/grades", authenticate, teacherOnly, async (req, res) => {
  try {
    const teacherThemeIds = await Theme.find({ teacher: req.user._id }).distinct("_id");
    const assignmentIds = await Assignment.find({ theme: { $in: teacherThemeIds } }).distinct("_id");
    const rows = await Submission.find({ assignment: { $in: assignmentIds } })
      .populate("student", "fullName username email")
      .populate("assignment", "title type maxScore deadline")
      .sort({ updatedAt: -1 })
      .lean();
    res.json(rows);
  } catch (err) {
    console.error("Ошибка загрузки оценок преподавателя:", err);
    res.status(500).json({ message: "Ошибка загрузки оценок" });
  }
});

app.put("/teacher/lms/grades/:id", authenticate, teacherOnly, async (req, res) => {
  try {
    const { manualScore } = req.body;
    const submission = await Submission.findById(req.params.id)
      .populate({ path: "assignment", populate: { path: "theme", select: "teacher" } });
    if (!submission) return res.status(404).json({ message: "Отправка не найдена" });
    if (String(submission.assignment.theme.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: "Можно оценивать только свои задания" });
    }

    const maxScore = submission.assignment.maxScore || 100;
    const score = Number(manualScore);
    if (Number.isNaN(score) || score < 0 || score > maxScore) {
      return res.status(400).json({ message: `Оценка должна быть от 0 до ${maxScore}` });
    }

    submission.manualScore = score;
    submission.finalScore = score;
    submission.status = "graded";
    submission.gradedAt = new Date();
    submission.gradedBy = req.user._id;
    await submission.save();

    res.json({ message: "Оценка обновлена", submission });
  } catch (err) {
    console.error("Ошибка выставления оценки преподавателем:", err);
    res.status(500).json({ message: "Ошибка изменения оценки" });
  }
});

app.post("/teacher/lms/grades/:id/recalculate", authenticate, teacherOnly, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate({ path: "assignment", populate: { path: "theme", select: "teacher" } });
    if (!submission) return res.status(404).json({ message: "Отправка не найдена" });
    if (String(submission.assignment.theme.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: "Можно пересчитывать только свои тесты" });
    }
    if (submission.assignment.type !== "TEST") {
      return res.status(400).json({ message: "Пересчёт доступен только для тестов" });
    }

    submission.autoScore = calculateTestScore(submission.assignment, submission.answers);
    submission.finalScore = submission.autoScore;
    submission.manualScore = undefined;
    submission.status = "graded";
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();
    await submission.save();

    res.json({ message: "Оценка пересчитана", submission });
  } catch (err) {
    console.error("Ошибка пересчёта оценки преподавателем:", err);
    res.status(500).json({ message: "Ошибка пересчёта" });
  }
});

app.post("/teacher/lms/assignments/:assignmentId/retake/:studentId", authenticate, teacherOnly, async (req, res) => {
  try {
    const { assignmentId, studentId } = req.params;
    const assignment = await Assignment.findById(assignmentId).populate("theme", "teacher");
    if (!assignment) return res.status(404).json({ message: "Задание не найдено" });
    if (String(assignment.theme.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: "Можно назначать повтор только по своим заданиям" });
    }

    const latest = await Submission.findOne({ assignment: assignmentId, student: studentId }).sort({ attempt: -1 });
    const nextAttempt = latest ? latest.attempt + 1 : 1;

    const created = await Submission.create({
      assignment: assignmentId,
      student: studentId,
      attempt: nextAttempt,
      status: "in_progress",
      reopenedByAdmin: req.user._id,
    });

    res.status(201).json({ message: "Создана повторная попытка", submission: created });
  } catch (err) {
    console.error("Ошибка создания повторной попытки преподавателем:", err);
    res.status(500).json({ message: "Ошибка повторной попытки" });
  }
});

app.get("/admin/dashboard-lms", async (_req, res) => {
  try {
    const [students, submissions, groups, gradedRows] = await Promise.all([
      User.find({ role: "student" }).select("fullName username email group lastLogin").populate("group", "name"),
      Submission.find().populate("assignment", "deadline").lean(),
      Group.find().lean(),
      Submission.find({ status: "graded" }).select("finalScore student").lean(),
    ]);

    const now = new Date();
    const completedCount = submissions.filter((s) => ["submitted", "graded"].includes(s.status)).length;
    const overdueCount = submissions.filter((s) => {
      const dl = s.assignment?.deadline ? new Date(s.assignment.deadline) : null;
      return dl && dl.getTime() < now.getTime() && s.status !== "graded" && s.status !== "submitted";
    }).length;

    const avgScore = gradedRows.length
      ? Math.round(gradedRows.reduce((sum, r) => sum + (r.finalScore || 0), 0) / gradedRows.length)
      : 0;

    const byGroup = groups.map((g) => {
      const studentIds = students.filter((s) => String(s.group?._id || s.group) === String(g._id)).map((s) => String(s._id));
      const gGrades = gradedRows.filter((r) => studentIds.includes(String(r.student)));
      const groupAvg = gGrades.length
        ? Math.round(gGrades.reduce((sum, r) => sum + (r.finalScore || 0), 0) / gGrades.length)
        : 0;
      return {
        groupId: g._id,
        groupName: g.name,
        studentsCount: studentIds.length,
        averageScore: groupAvg,
      };
    });

    res.json({
      studentsLastLogin: students,
      completedAssignments: completedCount,
      overdueAssignments: overdueCount,
      averageScore: avgScore,
      groupStats: byGroup,
    });
  } catch (err) {
    console.error("Ошибка LMS dashboard:", err);
    res.status(500).json({ message: "Ошибка LMS dashboard" });
  }
});

// ──── LMS (студент) ────

app.get("/student/courses", authenticate, studentOnly, async (req, res) => {
  try {
    if (!req.user.group) return res.json([]);
    const group = await Group.findById(req.user.group);
    if (!group) return res.json([]);
    const course = await Course.findById(group.course);
    if (!course) return res.json([]);
    res.json([course]);
  } catch (err) {
    console.error("Ошибка курсов студента:", err);
    res.status(500).json({ message: "Ошибка загрузки курсов" });
  }
});

app.get("/student/courses/:courseId/themes", authenticate, studentOnly, async (req, res) => {
  try {
    const themes = await Theme.find({ course: req.params.courseId }).sort({ createdAt: 1 });
    res.json(themes);
  } catch (err) {
    console.error("Ошибка тем курса:", err);
    res.status(500).json({ message: "Ошибка загрузки тем" });
  }
});

app.get("/student/themes/:themeId/assignments", authenticate, studentOnly, async (req, res) => {
  try {
    if (!req.user.group) return res.json([]);
    const assignments = await Assignment.find({
      theme: req.params.themeId,
      group: req.user.group,
      isActive: true,
      startAt: { $lte: new Date() },
    })
      .populate("category", "name")
      .sort({ deadline: 1 })
      .lean();

    const result = [];
    for (const a of assignments) {
      const latest = await Submission.findOne({ student: req.user._id, assignment: a._id }).sort({ attempt: -1 }).lean();
      let status = "не начато";
      if (latest?.status === "in_progress") status = "в процессе";
      if (latest && ["submitted", "graded"].includes(latest.status)) status = "выполнено";
      if (!latest && isAfterDeadline(a)) status = "просрочено";
      result.push({ ...a, status, latestSubmission: latest });
    }

    res.json(result);
  } catch (err) {
    console.error("Ошибка заданий темы:", err);
    res.status(500).json({ message: "Ошибка загрузки заданий" });
  }
});

app.get("/student/assignments/:id", authenticate, studentOnly, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("category", "name")
      .populate("group", "name")
      .populate("theme", "title course");
    if (!assignment) return res.status(404).json({ message: "Задание не найдено" });
    if (String(assignment.group._id || assignment.group) !== String(req.user.group)) {
      return res.status(403).json({ message: "Нет доступа к заданию" });
    }
    res.json(assignment);
  } catch (err) {
    console.error("Ошибка получения задания:", err);
    res.status(500).json({ message: "Ошибка загрузки задания" });
  }
});

app.post("/student/assignments/:id/start", authenticate, studentOnly, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Задание не найдено" });
    if (String(assignment.group) !== String(req.user.group)) {
      return res.status(403).json({ message: "Нет доступа" });
    }
    if (isAfterDeadline(assignment)) {
      return res.status(400).json({ message: "Дедлайн уже прошёл" });
    }

    const latest = await Submission.findOne({ student: req.user._id, assignment: assignment._id }).sort({ attempt: -1 });
    if (latest && latest.status === "in_progress") {
      return res.json({ message: "Попытка уже начата", submission: latest });
    }

    const attempt = latest ? latest.attempt + 1 : 1;
    const submission = await Submission.create({
      student: req.user._id,
      assignment: assignment._id,
      attempt,
      status: "in_progress",
    });

    res.status(201).json({ message: "Попытка создана", submission });
  } catch (err) {
    console.error("Ошибка старта задания:", err);
    res.status(500).json({ message: "Ошибка запуска задания" });
  }
});

app.post("/student/assignments/:id/test-submit", authenticate, studentOnly, async (req, res) => {
  try {
    const { answers } = req.body;
    const assignment = await Assignment.findOne({ _id: req.params.id, type: "TEST" });
    if (!assignment) return res.status(404).json({ message: "Тест не найден" });
    if (String(assignment.group) !== String(req.user.group)) {
      return res.status(403).json({ message: "Нет доступа" });
    }

    const latest = await Submission.findOne({ student: req.user._id, assignment: assignment._id }).sort({ attempt: -1 });
    if (!latest || latest.status !== "in_progress") {
      return res.status(400).json({ message: "Сначала начните попытку" });
    }

    latest.answers = Array.isArray(answers) ? answers : [];
    latest.autoScore = calculateTestScore(assignment, latest.answers);
    latest.finalScore = latest.autoScore;
    latest.status = "graded";
    latest.submittedAt = new Date();
    latest.gradedAt = new Date();
    await latest.save();

    res.json({ message: "Тест отправлен", submission: latest });
  } catch (err) {
    console.error("Ошибка отправки теста:", err);
    res.status(500).json({ message: "Ошибка отправки теста" });
  }
});

app.post("/student/assignments/:id/document-submit", authenticate, studentOnly, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Файл обязателен" });

    const assignment = await Assignment.findOne({ _id: req.params.id, type: "DOCUMENT" });
    if (!assignment) return res.status(404).json({ message: "Документное задание не найдено" });
    if (String(assignment.group) !== String(req.user.group)) {
      return res.status(403).json({ message: "Нет доступа" });
    }

    const latest = await Submission.findOne({ student: req.user._id, assignment: assignment._id }).sort({ attempt: -1 });
    if (!latest || latest.status !== "in_progress") {
      return res.status(400).json({ message: "Сначала начните попытку" });
    }

    latest.file = `/uploads/${req.file.filename}`;
    latest.status = "submitted";
    latest.submittedAt = new Date();
    latest.finalScore = latest.manualScore || 0;
    await latest.save();

    res.json({ message: "Файл отправлен", submission: latest });
  } catch (err) {
    console.error("Ошибка отправки файла:", err);
    res.status(500).json({ message: "Ошибка отправки файла" });
  }
});

app.get("/student/grades", authenticate, studentOnly, async (req, res) => {
  try {
    const rows = await Submission.find({ student: req.user._id })
      .populate("assignment", "title type deadline maxScore")
      .sort({ updatedAt: -1 });
    res.json(rows);
  } catch (err) {
    console.error("Ошибка загрузки оценок студента:", err);
    res.status(500).json({ message: "Ошибка загрузки оценок" });
  }
});

app.get("/admin/circles", async (req, res) => {
  try {
    const circles = await Circle.find()
      .populate("teacher", "fullName username")
      .select("-__v")
      .sort({ title: 1 });
    res.json(circles);
  } catch (err) {
    console.error("Ошибка загрузки кружков:", err);
    res.status(500).json({ message: "Ошибка загрузки кружков" });
  }
});

app.post("/admin/circles", async (req, res) => {
  try {
    const circle = await Circle.create(req.body);
    res.status(201).json({ message: "Кружок создан", circle });
  } catch (err) {
    console.error("Ошибка создания кружка:", err);
    res.status(400).json({ message: "Ошибка создания", error: err.message });
  }
});

app.put("/admin/circles/:id", async (req, res) => {
  try {
    const circle = await Circle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!circle) return res.status(404).json({ message: "Кружок не найден" });
    res.json({ message: "Кружок обновлён", circle });
  } catch (err) {
    console.error("Ошибка обновления кружка:", err);
    res.status(400).json({ message: "Ошибка обновления" });
  }
});

app.delete("/admin/circles/:id", async (req, res) => {
  try {
    const circle = await Circle.findByIdAndDelete(req.params.id);
    if (!circle) return res.status(404).json({ message: "Не найден" });
    await Enrollment.deleteMany({ circle: req.params.id });
    await Message.deleteMany({ circle: req.params.id });
    res.json({ message: "Кружок удалён" });
  } catch (err) {
    console.error("Ошибка удаления кружка:", err);
    res.status(500).json({ message: "Ошибка удаления" });
  }
});

app.get("/admin/enrollments", async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate("user", "username fullName phone email")
      .populate("circle", "title category")
      .sort({ createdAt: -1 })
      .select("-__v -updatedAt");
    res.json(enrollments);
  } catch (err) {
    console.error("Ошибка загрузки заявок:", err);
    res.status(500).json({ message: "Ошибка загрузки заявок" });
  }
});

app.put("/admin/enrollments/:id/status", async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!["approved", "rejected", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Недопустимый статус" });
    }

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: "Заявка не найдена" });

    const prevStatus = enrollment.status;
    enrollment.rejectionReason = status === "rejected" && rejectionReason ? rejectionReason.trim() : undefined;
    enrollment.rejectedAs = status === "rejected" ? (prevStatus === "approved" ? "removed_from_circle" : "application") : undefined;

    // Одобрение: атомарно увеличиваем места только если есть свободные (защита от race condition)
    if (status === "approved" && prevStatus !== "approved") {
      const updated = await Circle.findOneAndUpdate(
        { _id: enrollment.circle, $expr: { $lt: ["$currentPlaces", "$maxPlaces"] } },
        { $inc: { currentPlaces: 1 } },
        { new: true }
      );
      if (!updated) {
        return res.status(409).json({ message: "Нет свободных мест в кружке" });
      }
    }

    // Снятие одобрения: атомарно уменьшаем счётчик (не ниже 0)
    if (prevStatus === "approved" && status !== "approved") {
      await Circle.findOneAndUpdate(
        { _id: enrollment.circle },
        [{ $set: { currentPlaces: { $max: [0, { $subtract: ["$currentPlaces", 1] }] } } }]
      );
    }

    enrollment.status = status;
    await enrollment.save();

    res.json({ message: `Статус изменён → ${status}`, enrollment });
  } catch (err) {
    console.error("Ошибка изменения статуса:", err);
    res.status(500).json({ message: "Ошибка изменения статуса" });
  }
});

// Удаление заявки (админ)
app.delete("/admin/enrollments/:id", async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: "Заявка не найдена" });

    // Если заявка была одобрена — освобождаем место в кружке
    if (enrollment.status === "approved") {
      await Circle.findOneAndUpdate(
        { _id: enrollment.circle },
        [{ $set: { currentPlaces: { $max: [0, { $subtract: ["$currentPlaces", 1] }] } } }]
      );
    }

    await Enrollment.findByIdAndDelete(req.params.id);
    res.json({ message: "Заявка удалена" });
  } catch (err) {
    console.error("Ошибка удаления заявки:", err);
    res.status(500).json({ message: "Ошибка удаления заявки" });
  }
});

// Список пользователей (админ)
app.get("/admin/users", async (req, res) => {
  try {
    const users = await User.find()
      .populate("group", "name course")
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("Ошибка загрузки пользователей:", err);
    res.status(500).json({ message: "Ошибка загрузки пользователей" });
  }
});

// Смена роли пользователя (админ)
app.put("/admin/users/:id", async (req, res) => {
  try {
    const { role, group } = req.body;
    if (role !== undefined && !["student", "admin", "teacher"].includes(role)) {
      return res.status(400).json({ message: "Недопустимая роль" });
    }
    if (role !== undefined && req.params.id === req.user._id.toString() && role !== "admin") {
      return res.status(400).json({ message: "Нельзя снять себе роль администратора" });
    }

    if (group) {
      const groupDoc = await Group.findById(group);
      if (!groupDoc) {
        return res.status(400).json({ message: "Группа не найдена" });
      }
    }

    const updates = {};
    if (role !== undefined) updates.role = role;
    if (group !== undefined) updates.group = group || null;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate("group", "name course")
      .select("-password");
    if (!user) return res.status(404).json({ message: "Пользователь не найден" });
    res.json({ message: "Роль обновлена", user });
  } catch (err) {
    console.error("Ошибка обновления роли:", err);
    res.status(500).json({ message: "Ошибка обновления роли" });
  }
});

// Статистика (админ)
app.get("/admin/stats", async (req, res) => {
  try {
    const [circlesCount, enrollmentsCount, usersCount, topCircles] = await Promise.all([
      Circle.countDocuments({ isActive: true }),
      Enrollment.countDocuments(),
      User.countDocuments(),
      Enrollment.aggregate([
        { $group: { _id: "$circle", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "circles",
            localField: "_id",
            foreignField: "_id",
            as: "circleDoc",
          },
        },
        { $unwind: { path: "$circleDoc", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            title: { $ifNull: ["$circleDoc.title", "(удалён)"] },
            enrollmentsCount: "$count",
          },
        },
      ]),
    ]);

    res.json({
      circlesCount,
      enrollmentsCount,
      usersCount,
      topCircles,
    });
  } catch (err) {
    console.error("Ошибка загрузки статистики:", err);
    res.status(500).json({ message: "Ошибка загрузки статистики" });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    message: "Backend работает!",
    status: "online",
    time: new Date().toISOString(),
  });
});

app.get("/admin/teachers", async (_req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" })
      .select("fullName username email")
      .sort({ fullName: 1, username: 1 });
    res.json(teachers);
  } catch (err) {
    console.error("Ошибка загрузки преподавателей:", err);
    res.status(500).json({ message: "Ошибка загрузки преподавателей" });
  }
});

const clientDistDir = path.resolve(__dirname, "..", "dist");

if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));

  app.use((req, res, next) => {
    if (req.originalUrl === "/api" || req.originalUrl.startsWith("/api/")) {
      return res.status(404).json({ message: "Маршрут не найден" });
    }
    next();
  });

  app.get(/.*/, (req, res, next) => {
    if (req.originalUrl.startsWith("/uploads/")) {
      return next();
    }
    res.sendFile(path.join(clientDistDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`🚀 Сервер запущен → http://localhost:${port}`);
});