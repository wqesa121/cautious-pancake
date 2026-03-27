import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";

interface Message {
  _id: string;
  user: { fullName?: string; username: string };
  content: string;
  createdAt: string;
}

interface CircleChatProps {
  circleId: string;
  circleTitle: string;
  canWrite: boolean;
  onClose?: () => void;
}

export default function CircleChat({ circleId, circleTitle, canWrite, onClose }: CircleChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem("token");

  const fetchMessages = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/circles/${circleId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Не удалось загрузить сообщения");
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      toast.error("Ошибка загрузки чата");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [circleId]);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !token || !canWrite) return;
    setSending(true);
    try {
      const res = await fetch(`/api/circles/${circleId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Не удалось отправить");
      }
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setNewText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[280px] max-h-[400px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900">Чат: {circleTitle}</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-sm font-medium"
          >
            Закрыть
          </button>
        )}
      </div>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2 mb-3"
      >
        {loading ? (
          <p className="text-slate-500 text-sm">Загрузка...</p>
        ) : messages.length === 0 ? (
          <p className="text-slate-500 text-sm">Пока нет сообщений</p>
        ) : (
          messages.map((m) => (
            <div key={m._id} className="flex flex-col">
              <span className="text-xs font-medium text-slate-500">
                {m.user?.fullName || m.user?.username} ·{" "}
                {new Date(m.createdAt).toLocaleString("ru-RU")}
              </span>
              <p className="text-slate-800 text-sm whitespace-pre-wrap break-words">{m.content}</p>
            </div>
          ))
        )}
      </div>
      {canWrite && (
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Написать студентам (например: завтра занятие в 15:00)"
            className="input-base flex-1 !py-2 text-sm"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={sending || !newText.trim()}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "..." : "Отправить"}
          </button>
        </form>
      )}
    </div>
  );
}
