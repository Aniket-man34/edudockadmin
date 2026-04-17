import React, { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import {
  Send,
  Trash2,
  Loader2,
  MessageSquare,
  Check,
  CheckCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase, TABLES } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Message } from '@/types/message'

const MessagesManager: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { toast } = useToast()
  const { user, fullName, avatarUrl } = useAuth()

  // Fetch messages from Supabase
  const fetchMessages = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.MESSAGES)
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])

      // Mark messages as read
      if (data && data.length > 0) {
        const unreadMessages = data.filter((msg) => !msg.is_read && msg.sender_id !== user?.id)
        if (unreadMessages.length > 0) {
          await Promise.all(
            unreadMessages.map((msg) =>
              supabase
                .from(TABLES.MESSAGES)
                .update({ is_read: true })
                .eq('id', msg.id)
            )
          )
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch messages. Please check your Supabase configuration.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.MESSAGES)
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user?.id || '')

      if (error) throw error
      setUnreadCount(data?.length || 0)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  // Real-time subscription for new messages
  useEffect(() => {
    fetchMessages()
    fetchUnreadCount()

    // Subscribe to new messages using custom channel
    const channel = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.MESSAGES,
        },
        (payload) => {
          // Add all new messages from realtime subscription
          setMessages((prev) => [...prev, payload.new as Message])
          fetchUnreadCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: TABLES.MESSAGES,
        },
        (payload) => {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id))
          fetchUnreadCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: TABLES.MESSAGES,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? (payload.new as Message) : msg
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a message.',
        variant: 'destructive',
      })
      return
    }

    setNewMessage('')
    setSending(true)

    try {
      const { error } = await supabase
        .from(TABLES.MESSAGES)
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          sender_name: fullName || 'Admin',
          sender_avatar: avatarUrl || null,
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Message sent successfully!',
        variant: 'default',
      })
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return

    try {
      const { error } = await supabase
        .from(TABLES.MESSAGES)
        .delete()
        .eq('id', messageId)

      if (error) throw error

      toast({
        title: 'Deleted',
        description: 'Message deleted successfully.',
        variant: 'default',
      })
    } catch (error) {
      console.error('Error deleting message:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete message. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      
      if (isToday) {
        return format(date, 'HH:mm')
      } else {
        return format(date, 'MMM dd, HH:mm')
      }
    } catch {
      return dateString
    }
  }

  const isOwnMessage = (message: Message) => message.sender_id === user?.id

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Messages</h1>
              <p className="text-sm text-gray-600">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All messages read'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="ml-2 text-gray-500">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageSquare className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg">No messages yet</p>
            <p className="text-sm">Send your first message to start the conversation!</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  isOwnMessage(message) ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {message.sender_avatar ? (
                    <img
                      src={message.sender_avatar}
                      alt={message.sender_name}
                      className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {message.sender_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div
                  className={`flex flex-col max-w-[70%] ${
                    isOwnMessage(message) ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl shadow-sm ${
                      isOwnMessage(message)
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white text-gray-900 rounded-bl-md'
                    }`}
                  >
                    {/* Sender Name */}
                    {!isOwnMessage(message) && (
                      <p className="text-xs font-semibold mb-1 opacity-90">
                        {message.sender_name}
                      </p>
                    )}
                    {/* Message Text */}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>

                  {/* Timestamp and Actions */}
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatDate(message.created_at)}
                    </span>
                    {isOwnMessage(message) && (
                      <>
                        {message.is_read ? (
                          <CheckCheck className="h-3 w-3 text-blue-500" />
                        ) : (
                          <Check className="h-3 w-3 text-gray-400" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-red-600"
                          onClick={() => handleDeleteMessage(message.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            {/* User Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName || 'Admin'}
                className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {(fullName || 'A').charAt(0).toUpperCase()}
              </div>
            )}

            {/* Input Field */}
            <div className="flex-1">
              <Label htmlFor="message-input" className="sr-only">
                Type a message
              </Label>
              <Textarea
                id="message-input"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                rows={1}
                className="resize-none min-h-[44px] max-h-[120px]"
                disabled={sending}
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              className="h-[44px] px-6"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}

export default MessagesManager
