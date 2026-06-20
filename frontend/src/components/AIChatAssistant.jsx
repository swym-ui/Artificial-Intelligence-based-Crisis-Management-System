import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Send, Bot, User, Database, ArrowRight, Terminal } from 'lucide-react';

const AIChatAssistant = ({ scenario }) => {
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            content: "Greetings, Commander. I am the AICMS Command Assistant, connected directly to our SQLite emergency database. Ask me any question about shelters, incidents, SMS distress feeds, CAP alerts, or active responder statistics.",
            sql: null
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const suggestions = [
        "Which shelters have wheelchair access and adequate food?",
        "List all active flood incidents with severity above 80.",
        "Show recent SMS messages reporting medical needs.",
        "Find the contact number for City College Shelter."
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (text) => {
        const queryText = text || input;
        if (!queryText.strip?.() && !queryText.trim()) return;

        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: queryText }]);
        if (!text) setInput('');
        setLoading(true);

        try {
            const response = await api.queryAIChat({
                question: queryText,
                scenario: scenario
            });

            // Add bot response
            setMessages(prev => [...prev, {
                role: 'bot',
                content: response.data.response,
                sql: response.data.sql
            }]);
        } catch (error) {
            console.error("AI Chat Error:", error);
            setMessages(prev => [...prev, {
                role: 'bot',
                content: "Commander, I encountered a communication error connecting to the database query service. Please verify the Groq API key in the server configuration.",
                sql: null
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-230px)] min-h-[500px] bg-white dark:bg-black rounded-xl overflow-hidden shadow-md dark:shadow-2xl border border-slate-200 dark:border-slate-800 font-sans transition-colors duration-205">
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-655 dark:text-blue-400">
                        <Bot size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-base">Database NLP Assistant</h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Text-to-SQL Engine Active</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-green-600 dark:text-green-400 transition-colors">
                    <Database size={12} className="animate-pulse" />
                    cms.db
                </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-950/40 transition-colors">
                {messages.map((msg, index) => {
                    const isBot = msg.role === 'bot';
                    return (
                        <div key={index} className={`flex gap-4 ${isBot ? 'justify-start' : 'justify-end'}`}>
                            {isBot && (
                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-600/20 border border-blue-205 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-inner">
                                    <Bot size={16} />
                                </div>
                            )}
                            
                            <div className="max-w-[75%] space-y-2">
                                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed transition-colors ${
                                    isBot 
                                        ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-800/80 shadow-xs' 
                                        : 'bg-blue-600 text-white rounded-tr-none'
                                }`}>
                                    <p className="whitespace-pre-line">{msg.content}</p>
                                    
                                    {/* Render SQL execution transparency in collapsible container */}
                                    {isBot && msg.sql && msg.sql !== 'N/A' && (
                                        <div className="mt-3 border-t border-slate-200 dark:border-slate-800 pt-3">
                                            <details className="group cursor-pointer">
                                                <summary className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 select-none hover:text-green-600 dark:hover:text-green-400 transition-colors">
                                                    <Terminal size={12} />
                                                    <span>Show Database SQL Query</span>
                                                </summary>
                                                <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-green-600 dark:text-green-400 overflow-x-auto leading-relaxed shadow-inner select-text">
                                                    {msg.sql}
                                                </div>
                                            </details>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!isBot && (
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow">
                                    <User size={16} />
                                </div>
                            )}
                        </div>
                    );
                })}
                {loading && (
                    <div className="flex gap-4 justify-start">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-600/20 border border-blue-205 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <Bot size={16} />
                        </div>
                        <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-300 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800/60 flex items-center gap-2 shadow-xs transition-colors">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions Panel */}
            {messages.length === 1 && (
                <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 transition-colors">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Quick Database Queries:</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((sug, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(sug)}
                                className="text-xs text-blue-600 dark:text-blue-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-700 px-3 py-1.5 rounded-lg text-left transition-all duration-200 flex items-center gap-1.5 shadow-xs"
                            >
                                <span className="flex-1">{sug}</span>
                                <ArrowRight size={10} className="text-slate-400 dark:text-slate-500 shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex gap-3"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask SQL Assistant (e.g., 'show shelters in Indira Nagar with food shortages')...."
                        disabled={loading}
                        className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-550 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-sans disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="w-12 h-12 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-950/20 disabled:text-slate-400 dark:disabled:text-slate-500"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIChatAssistant;
