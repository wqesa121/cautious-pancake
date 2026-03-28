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
const isProduction = process.env.NODE_ENV === "production";
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/student_circles_db";

if (!process.env.MONGODB_URI && !isProduction) {
  console.warn("[config] MONGODB_URI не задан, используется локальная MongoDB");
}

if (!process.env.MONGODB_URI && isProduction) {
  throw new Error("MONGODB_URI обязателен в production");
}

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

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";

if (!process.env.JWT_SECRET && !isProduction) {
  console.warn("[config] JWT_SECRET не задан, используется dev secret");
}

if (!process.env.JWT_SECRET && isProduction) {
  throw new Error("JWT_SECRET обязателен в production");
}

// ────────────────────────────────────────────────
// МОДЕЛИ
// ────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "admin", "head_admin"], default: "student" },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
  lastLogin: { type: Date },
  lastSeenAt: { type: Date },
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

    const now = new Date();
    const lastSeen = user.lastSeenAt ? new Date(user.lastSeenAt) : null;
    if (!lastSeen || now.getTime() - lastSeen.getTime() > 60 * 1000) {
      user.lastSeenAt = now;
      User.findByIdAndUpdate(user._id, { lastSeenAt: now }).catch((err) => {
        console.error("Ошибка обновления lastSeenAt:", err);
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Недействительный токен" });
  }
};

const adminOnly = (req, res, next) => {
  if (!["admin", "head_admin"].includes(req.user.role)) {
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

  // Оценка теста в процентах: доля правильных ответов от всех вопросов.
  const percentScore = (correctCount / questions.length) * 100;
  return Math.max(0, Math.min(100, Number(percentScore.toFixed(2))));
};

// ────────────────────────────────────────────────
// РОУТЫ
// ────────────────────────────────────────────────

app.get("/groups/public", async (_req, res) => {
  try {
    const groups = await Group.find().populate("course", "title").sort({ name: 1 });
    res.json(groups);
  } catch (err) {
    console.error("Ошибка загрузки публичных групп:", err);
    res.status(500).json({ message: "Ошибка загрузки групп" });
  }
});

// Регистрация — исправленная версия
app.post("/register", async (req, res) => {
  try {
    let { username, password, fullName, phone, email, group } = req.body;

    if (!username || typeof username !== 'string' || username.trim() === '') {
      return res.status(400).json({ message: "Поле username обязательно и не может быть пустым" });
    }
    if (!password || password.trim() === '') {
      return res.status(400).json({ message: "Пароль обязателен" });
    }
    if (!fullName || fullName.trim() === '') {
      return res.status(400).json({ message: "ФИО обязательно" });
    }
    if (!group || typeof group !== "string" || group.trim() === "") {
      return res.status(400).json({ message: "Выберите группу" });
    }

    username = username.trim().toLowerCase();
    if (email) email = email.trim().toLowerCase();
    group = group.trim();

    const selectedGroup = await Group.findById(group);
    if (!selectedGroup) {
      return res.status(400).json({ message: "Выбранная группа не найдена" });
    }

    const existByUsername = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    const existByEmail = email ? await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    }) : null;

    if (existByUsername || existByEmail) {
      return res.status(409).json({ message: "Пользователь с таким логином или email уже существует" });
    }

    const user = new User({
      username,
      password,
      fullName,
      phone,
      email,
      group: selectedGroup._id,
    });

    await user.save();

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
    user.lastSeenAt = new Date();
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

app.use("/admin", (req, res, next) => {
  // Let SPA route /admin load without API auth checks on browser refresh.
  if (req.method === "GET" && req.path === "/") {
    return next();
  }

  return authenticate(req, res, () => adminOnly(req, res, next));
});

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

app.get("/admin/groups", async (req, res) => {
  try {
    let query = Group.find().populate("course", "title").sort({ createdAt: -1 });
    
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group");
      if (!adminUser?.group) {
        return res.json([]);
      }
      query = query.where("_id").equals(adminUser.group);
    }
    
    const groups = await query;
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

app.get("/admin/themes", async (req, res) => {
  try {
    let query = Theme.find().populate("course", "title").sort({ createdAt: -1 });
    
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group").populate("group", "course");
      if (!adminUser?.group?.course) {
        return res.json([]);
      }
      query = query.where("course").equals(adminUser.group.course);
    }
    
    const themes = await query;
    res.json(themes);
  } catch (err) {
    console.error("Ошибка загрузки тем:", err);
    res.status(500).json({ message: "Ошибка загрузки тем" });
  }
});

app.post("/admin/themes", async (req, res) => {
  try {
    const { title, description, course } = req.body;
    if (!title?.trim() || !course) return res.status(400).json({ message: "title и course обязательны" });
    
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group").populate("group", "course");
      if (!adminUser?.group?.course || adminUser.group.course.toString() !== course) {
        return res.status(403).json({ message: "Вы можете создавать темы только для курса вашей группы" });
      }
    }
    
    const created = await Theme.create({ title: title.trim(), description, course });
    res.status(201).json({ message: "Тема создана", theme: created });
  } catch (err) {
    console.error("Ошибка создания темы:", err);
    res.status(500).json({ message: "Ошибка создания темы" });
  }
});

app.put("/admin/themes/:id", async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.id);
    if (!theme) return res.status(404).json({ message: "Тема не найдена" });
    
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group").populate("group", "course");
      if (!adminUser?.group?.course || theme.course.toString() !== adminUser.group.course.toString()) {
        return res.status(403).json({ message: "Вы можете редактировать только темы вашего курса" });
      }
    }
    
    const updated = await Theme.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ message: "Тема обновлена", theme: updated });
  } catch (err) {
    console.error("Ошибка обновления темы:", err);
    res.status(500).json({ message: "Ошибка обновления темы" });
  }
});

app.delete("/admin/themes/:id", async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.id);
    if (!theme) return res.status(404).json({ message: "Тема не найдена" });
    
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group").populate("group", "course");
      if (!adminUser?.group?.course || theme.course.toString() !== adminUser.group.course.toString()) {
        return res.status(403).json({ message: "Вы можете удалять только темы вашего курса" });
      }
    }
    
    const deleted = await Theme.findByIdAndDelete(req.params.id);
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

app.get("/admin/assignments", async (req, res) => {
  try {
    let query = Assignment.find()
      .populate("theme", "title")
      .populate("group", "name")
      .populate("category", "name")
      .sort({ createdAt: -1 });
    
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group");
      if (!adminUser?.group) {
        return res.json([]);
      }
      query = query.where("group").equals(adminUser.group);
    }
    
    const assignments = await query;
    res.json(assignments);
  } catch (err) {
    console.error("Ошибка загрузки заданий:", err);
    res.status(500).json({ message: "Ошибка загрузки заданий" });
  }
});

app.post("/admin/assignments", async (req, res) => {
  try {
    const { group } = req.body;
    
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group");
      if (!adminUser?.group || adminUser.group.toString() !== group) {
        return res.status(403).json({ message: "Вы можете создавать задания только для вашей группы" });
      }
    }
    
    const payload = {
      ...req.body,
      maxScore: 100,
    };
    const created = await Assignment.create(payload);
    res.status(201).json({ message: "Задание создано", assignment: created });
  } catch (err) {
    console.error("Ошибка создания задания:", err);
    res.status(500).json({ message: "Ошибка создания задания" });
  }
});

app.put("/admin/assignments/:id", async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Задание не найдено" });
    
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group");
      if (!adminUser?.group || assignment.group.toString() !== adminUser.group.toString()) {
        return res.status(403).json({ message: "Вы можете редактировать задания только вашей группы" });
      }
    }
    
    const payload = {
      ...req.body,
      maxScore: 100,
    };
    const updated = await Assignment.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    res.json({ message: "Задание обновлено", assignment: updated });
  } catch (err) {
    console.error("Ошибка обновления задания:", err);
    res.status(500).json({ message: "Ошибка обновления задания" });
  }
});

app.delete("/admin/assignments/:id", async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Задание не найдено" });
    
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group");
      if (!adminUser?.group || assignment.group.toString() !== adminUser.group.toString()) {
        return res.status(403).json({ message: "Вы можете удалять задания только вашей группы" });
      }
    }
    
    await Submission.deleteMany({ assignment: req.params.id });
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: "Задание удалено" });
  } catch (err) {
    console.error("Ошибка удаления задания:", err);
    res.status(500).json({ message: "Ошибка удаления задания" });
  }
});

app.post("/admin/assignments/:id/document", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Файл обязателен" });
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Задание не найдено" });
    if (assignment.type !== "DOCUMENT") return res.status(400).json({ message: "Это не документное задание" });
    assignment.documentFile = `/uploads/${req.file.filename}`;
    await assignment.save();
    res.json({ message: "Файл задания загружен", assignment });
  } catch (err) {
    console.error("Ошибка загрузки файла задания:", err);
    res.status(500).json({ message: "Ошибка загрузки файла" });
  }
});

app.put("/admin/assignments/:id/test", async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Задание не найдено" });
    if (assignment.type !== "TEST") return res.status(400).json({ message: "Это не тест" });
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Нужен массив вопросов" });
    }
    assignment.questions = questions;
    await assignment.save();
    res.json({ message: "Тест обновлён", assignment });
  } catch (err) {
    console.error("Ошибка обновления теста:", err);
    res.status(500).json({ message: "Ошибка обновления теста" });
  }
});

app.get("/admin/grades", async (req, res) => {
  try {
    let query = Submission.find()
      .populate("student", "fullName username email group")
      .populate("assignment", "title type maxScore deadline")
      .sort({ updatedAt: -1 });
    
    let rows = await query.lean();
    
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group");
      if (!adminUser?.group) {
        rows = [];
      } else {
        rows = rows.filter(row => 
          row.student?.group && row.student.group.toString() === adminUser.group.toString()
        );
      }
    }
    
    res.json(rows);
  } catch (err) {
    console.error("Ошибка загрузки оценок:", err);
    res.status(500).json({ message: "Ошибка загрузки оценок" });
  }
});

app.put("/admin/grades/:id", async (req, res) => {
  try {
    const { manualScore } = req.body;
    const submission = await Submission.findById(req.params.id).populate("student", "group").populate("assignment", "maxScore");
    if (!submission) return res.status(404).json({ message: "Отправка не найдена" });

    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group");
      if (!adminUser?.group || submission.student.group.toString() !== adminUser.group.toString()) {
        return res.status(403).json({ message: "Вы можете выставлять оценки только студентам своей группы" });
      }
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
    console.error("Ошибка выставления оценки:", err);
    res.status(500).json({ message: "Ошибка изменения оценки" });
  }
});

app.post("/admin/grades/:id/recalculate", async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).populate("assignment").populate("student", "group");
    if (!submission) return res.status(404).json({ message: "Отправка не найдена" });
    if (submission.assignment.type !== "TEST") {
      return res.status(400).json({ message: "Пересчёт доступен только для тестов" });
    }

    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group");
      if (!adminUser?.group || submission.student.group.toString() !== adminUser.group.toString()) {
        return res.status(403).json({ message: "Вы можете пересчитывать оценки только для студентов своей группы" });
      }
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
    console.error("Ошибка пересчёта оценки:", err);
    res.status(500).json({ message: "Ошибка пересчёта" });
  }
});

app.post("/admin/assignments/:assignmentId/retake/:studentId", async (req, res) => {
  try {
    const { assignmentId, studentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: "Задание не найдено" });
    
    const student = await User.findById(studentId).select("group");
    if (!student) return res.status(404).json({ message: "Студент не найден" });

    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group");
      if (!adminUser?.group || student.group.toString() !== adminUser.group.toString()) {
        return res.status(403).json({ message: "Вы можете создавать повторные попытки только для студентов своей группы" });
      }
    }

    const latestByStudent = await Submission.findOne({ assignment: assignmentId, student: studentId }).sort({ attempt: -1 });
    const overdue = isAfterDeadline(assignment);
    const alreadyDone = !!latestByStudent && ["submitted", "graded", "overdue"].includes(latestByStudent.status);
    const isTest = assignment.type === "TEST";

    if (!isTest && !overdue && !alreadyDone) {
      return res.status(400).json({
        message: "Повторная попытка доступна для тестов, просроченных или уже выполненных заданий",
      });
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
    console.error("Ошибка создания повторной попытки:", err);
    res.status(500).json({ message: "Ошибка повторной попытки" });
  }
});

app.get("/admin/dashboard-lms", async (req, res) => {
  try {
    let adminGroupId = null;
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group");
      if (!adminUser?.group) {
        return res.json({
          studentsLastLogin: [],
          completedAssignments: 0,
          overdueAssignments: 0,
          averageScore: 0,
          groupStats: [],
          studentGrades: [],
          completedAssignmentsList: [],
          overdueAssignmentsList: [],
        });
      }
      adminGroupId = adminUser.group;
    }

    const studentsFilter = { role: "student" };
    const groupsFilter = {};
    if (adminGroupId) {
      studentsFilter.group = adminGroupId;
      groupsFilter._id = adminGroupId;
    }

    const [students, submissions, groups] = await Promise.all([
      User.find(studentsFilter).select("fullName username email group lastLogin").populate("group", "name"),
      Submission.find()
        .populate("student", "fullName username group")
        .populate("assignment", "title deadline type maxScore")
        .lean(),
      Group.find(groupsFilter).lean(),
    ]);

    let filteredSubmissions = submissions;
    if (req.user.role === "admin") {
      const studentIds = students.map(s => s._id.toString());
      filteredSubmissions = submissions.filter(s => studentIds.includes(s.student?._id?.toString()));
    }

    const now = new Date();
    const completedCount = filteredSubmissions.filter((s) => ["submitted", "graded"].includes(s.status)).length;
    const overdueCount = filteredSubmissions.filter((s) => {
      const dl = s.assignment?.deadline ? new Date(s.assignment.deadline) : null;
      return dl && dl.getTime() < now.getTime() && s.status !== "graded" && s.status !== "submitted";
    }).length;

    const gradedRows = filteredSubmissions.filter((s) => s.status === "graded");
    const avgScore = gradedRows.length
      ? Math.round(gradedRows.reduce((sum, r) => sum + (r.finalScore || 0), 0) / gradedRows.length)
      : 0;

    const byGroup = groups.map((g) => {
      const studentIds = students.filter((s) => String(s.group?._id || s.group) === String(g._id)).map((s) => String(s._id));
      const gGrades = gradedRows.filter((r) => studentIds.includes(String(r.student?._id || r.student)));
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

    const completedAssignmentsList = filteredSubmissions
      .filter((s) => ["submitted", "graded"].includes(s.status))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 200)
      .map((s) => ({
        submissionId: s._id,
        status: s.status,
        finalScore: s.finalScore || 0,
        updatedAt: s.updatedAt,
        student: s.student ? { _id: s.student._id, fullName: s.student.fullName, username: s.student.username } : null,
        assignment: s.assignment ? { _id: s.assignment._id, title: s.assignment.title, type: s.assignment.type, deadline: s.assignment.deadline } : null,
      }));

    const overdueAssignmentsList = filteredSubmissions
      .filter((s) => {
        const dl = s.assignment?.deadline ? new Date(s.assignment.deadline) : null;
        return dl && dl.getTime() < now.getTime() && !["submitted", "graded"].includes(s.status);
      })
      .sort((a, b) => new Date(a.assignment.deadline).getTime() - new Date(b.assignment.deadline).getTime())
      .slice(0, 200)
      .map((s) => ({
        submissionId: s._id,
        status: s.status,
        updatedAt: s.updatedAt,
        student: s.student ? { _id: s.student._id, fullName: s.student.fullName, username: s.student.username } : null,
        assignment: s.assignment ? { _id: s.assignment._id, title: s.assignment.title, type: s.assignment.type, deadline: s.assignment.deadline } : null,
      }));

    const studentGrades = students.map((student) => {
      const items = gradedRows.filter((s) => String(s.student?._id || s.student) === String(student._id));
      const average = items.length ? Math.round(items.reduce((sum, s) => sum + (s.finalScore || 0), 0) / items.length) : 0;
      return {
        studentId: student._id,
        fullName: student.fullName,
        username: student.username,
        groupName: typeof student.group === "string" ? student.group : student.group?.name || "-",
        averageScore: average,
        grades: items.map((s) => ({
          submissionId: s._id,
          assignmentTitle: s.assignment?.title || "-",
          assignmentType: s.assignment?.type || "-",
          score: s.finalScore || 0,
          gradedAt: s.gradedAt,
        })),
      };
    });

    res.json({
      studentsLastLogin: students,
      completedAssignments: completedCount,
      overdueAssignments: overdueCount,
      averageScore: avgScore,
      groupStats: byGroup,
      studentGrades,
      completedAssignmentsList,
      overdueAssignmentsList,
    });
  } catch (err) {
    console.error("Ошибка LMS dashboard:", err);
    res.status(500).json({ message: "Ошибка LMS dashboard" });
  }
});

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

    const assignmentData = assignment.toObject();
    assignmentData.questions = (assignmentData.questions || []).map((question) => {
      const correctAnswersCount = (question.options || []).filter((option) => !!option.isCorrect).length;

      return {
        ...question,
        allowMultiple: correctAnswersCount > 1,
        options: (question.options || []).map((option) => ({ text: option.text })),
      };
    });

    res.json(assignmentData);
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

app.get("/admin/users", async (req, res) => {
  try {
    const hasHeadAdmin = await User.exists({ role: "head_admin" });
    const canManageAdminRoles = req.user.role === "head_admin" || (!hasHeadAdmin && req.user.role === "admin");

    let query = User.find();
    
    // Regular admin sees only students from their group
    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group");
      query = query.where("role").equals("student").where("group").equals(adminUser?.group);
    }
    
    const users = await query
      .populate("group", "name course")
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const nowTs = Date.now();
    const onlineWindowMs = 5 * 60 * 1000;
    const payload = users.map((user) => {
      const lastSeenTs = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : 0;
      return {
        ...user,
        isOnline: !!lastSeenTs && nowTs - lastSeenTs <= onlineWindowMs,
        canManageAdminRoles,
      };
    });

    res.json(payload);
  } catch (err) {
    console.error("Ошибка загрузки пользователей:", err);
    res.status(500).json({ message: "Ошибка загрузки пользователей" });
  }
});

app.put("/admin/users/:id", async (req, res) => {
  try {
    const { role, group } = req.body;
    if (role !== undefined && !["student", "admin", "head_admin"].includes(role)) {
      return res.status(400).json({ message: "Недопустимая роль" });
    }

    const targetUser = await User.findById(req.params.id).select("role");
    if (!targetUser) return res.status(404).json({ message: "Пользователь не найден" });

    if (role !== undefined) {
      const requesterIsHead = req.user.role === "head_admin";
      const hasHeadAdmin = await User.exists({ role: "head_admin" });
      const bootstrapMode = !hasHeadAdmin && req.user.role === "admin";
      const targetIsAdminLevel = ["admin", "head_admin"].includes(targetUser.role);
      const nextIsAdminLevel = ["admin", "head_admin"].includes(role);

      if ((targetIsAdminLevel || nextIsAdminLevel) && !requesterIsHead && !bootstrapMode) {
        return res.status(403).json({ message: "Только head admin может менять админские роли" });
      }

      if (req.params.id === req.user._id.toString() && role === "student") {
        return res.status(400).json({ message: "Нельзя снять с себя административную роль" });
      }

      if (req.params.id === req.user._id.toString() && req.user.role === "head_admin" && role !== "head_admin") {
        return res.status(400).json({ message: "Head admin не может понизить себя" });
      }
    }

    if (group) {
      const groupDoc = await Group.findById(group);
      if (!groupDoc) {
        return res.status(400).json({ message: "Группа не найдена" });
      }
    }

    const updates = {};
    if (role !== undefined) {
      updates.role = role;
    }
    if (group !== undefined) {
      if (["admin", "head_admin"].includes(targetUser.role) || ["admin", "head_admin"].includes(role)) {
        return res.status(403).json({ message: "Администраторы не могут менять свою группу" });
      }
      updates.group = group || null;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate("group", "name course")
      .select("-password");
    if (!user) return res.status(404).json({ message: "Пользователь не найден" });
    res.json({ message: "Пользователь обновлён", user });
  } catch (err) {
    console.error("Ошибка обновления роли:", err);
    res.status(500).json({ message: "Ошибка обновления роли" });
  }
});

app.delete("/admin/users/:id", async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Нельзя удалить самого себя" });
    }

    const targetUser = await User.findById(req.params.id).select("role group");
    if (!targetUser) return res.status(404).json({ message: "Пользователь не найден" });

    if (req.user.role === "admin") {
      const adminUser = await User.findById(req.user._id).select("group");
      if (!adminUser?.group) {
        return res.status(403).json({ message: "Для вашего аккаунта не назначена группа" });
      }
      if (targetUser.role !== "student") {
        return res.status(403).json({ message: "Обычный админ может удалять только участников своей группы" });
      }
      if (!targetUser.group || targetUser.group.toString() !== adminUser.group.toString()) {
        return res.status(403).json({ message: "Можно удалять только участников своей группы" });
      }
    }

    const requesterIsHead = req.user.role === "head_admin";
    const hasHeadAdmin = await User.exists({ role: "head_admin" });
    const bootstrapMode = !hasHeadAdmin && req.user.role === "admin";

    if (["admin", "head_admin"].includes(targetUser.role) && !requesterIsHead && !bootstrapMode) {
      return res.status(403).json({ message: "Только head admin может удалять администраторов" });
    }

    await Submission.deleteMany({ student: req.params.id });
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "Пользователь удалён" });
  } catch (err) {
    console.error("Ошибка удаления пользователя:", err);
    res.status(500).json({ message: "Ошибка удаления пользователя" });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    message: "Backend работает!",
    status: "online",
    time: new Date().toISOString(),
  });
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
