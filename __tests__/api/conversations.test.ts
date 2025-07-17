
import { NextRequest } from 'next/server'
import { GET as getConversations } from '../../app/api/conversations/route'
import { GET as getConversationHistory } from '../../app/api/conversations/[id]/route'

// Mock fetch globally
global.fetch = jest.fn()

describe('/api/conversations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 when session_id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/conversations')
    const response = await getConversations(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('session_id is required')
  })

  it('should return conversations when session_id is provided', async () => {
    const mockConversations = [
      { conversation_id: '1', name: 'Test Chat', started_at: '2024-01-01T00:00:00Z' }
    ]
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockConversations
    })
    
    const request = new NextRequest('http://localhost:3000/api/conversations?session_id=test-session')
    const response = await getConversations(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toEqual(mockConversations)
  })

  it('should handle n8n webhook errors', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    })
    
    const request = new NextRequest('http://localhost:3000/api/conversations?session_id=test-session')
    const response = await getConversations(request)
    
    expect(response.status).toBe(500)
  })
})

describe('/api/conversations/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 when parameters are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/conversations/123')
    const response = await getConversationHistory(request, { params: { id: '123' } })
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('session_id and conversation_id are required')
  })

  it('should return conversation history when parameters are valid', async () => {
    const mockHistory = [
      { 
        event_type: 'message',
        user_message: 'Hello',
        ai_message: 'Hi there!',
        timestamp: '2024-01-01T00:00:00Z'
      }
    ]
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHistory
    })
    
    const request = new NextRequest('http://localhost:3000/api/conversations/123?session_id=test-session')
    const response = await getConversationHistory(request, { params: { id: '123' } })
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toEqual(mockHistory)
  })
})
