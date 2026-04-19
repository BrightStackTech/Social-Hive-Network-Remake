import { usePubSub, useMeeting } from "@videosdk.live/react-sdk";
import { useState, useRef, useEffect } from "react";
import { Send, X } from "lucide-react";
import { useMeetingAppContext } from "./MeetingAppContextDef";

export function ChatPanel() {
  const [message, setMessage] = useState("");
  const { setSideBarMode } = useMeetingAppContext();
  const listRef = useRef<HTMLDivElement>(null);

  const { localParticipant } = useMeeting();
  const { publish, messages } = usePubSub("CHAT");
  const isSendingRef = useRef(false);

  // Deduplicated messages for count and display
  const uniqueMessages = messages.filter((msg: any, index: number, self: any[]) => 
    index === self.findIndex((m) => m.id === msg.id || (m.timestamp === msg.timestamp && m.message === msg.message))
  );

  useEffect(() => {
    if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    const messageText = message.trim();
    if (messageText.length > 0 && !isSendingRef.current) {
      isSendingRef.current = true;
      publish(messageText, { persist: true });
      setMessage("");
      // Reset guard after short delay to allow next message
      setTimeout(() => { isSendingRef.current = false; }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-10 flex flex-col h-full bg-[#0a0b0d] md:bg-[#1a1b1d] border-l border-white/5 w-full md:w-80 shadow-2xl">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <h3 className="text-white font-bold flex items-center gap-2">
            Chat
            <span className="bg-[#5d6bf8] text-[10px] px-1.5 py-0.5 rounded-full">{uniqueMessages.length}</span>
        </h3>
        <button onClick={() => setSideBarMode(null)} className="text-white/40 hover:text-white cursor-pointer">
          <X size={20} />
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {uniqueMessages.map((msg: any, i: number) => {
          const isLocal = msg.senderId === localParticipant?.id;
          return (
            <div key={i} className={`flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${isLocal ? 'bg-[#5d6bf8] text-white rounded-tr-none' : 'bg-white/5 text-white/90 rounded-tl-none'}`}>
                {!isLocal && <p className="text-[10px] font-bold text-[#5d6bf8] mb-1">{msg.senderName}</p>}
                <p>{msg.message}</p>
              </div>
              <p className="text-[9px] text-white/20 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5">
        <div className="relative flex items-center">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-[#5d6bf8]/50 outline-none transition-all pr-12"
          />
          <button
            onClick={handleSendMessage}
            className="absolute right-2 p-2 bg-[#5d6bf8] text-white rounded-lg hover:bg-[#4b58e2] transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
