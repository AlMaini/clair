export interface Resource {
  title: string
  url: string
  resource_type: string
}

export interface Category {
  id: string
  name: string
  description: string
  note_count: number
}

export interface NoteResponse {
  id: string
  raw_content: string
  processed_content: string | null
  content_type: 'text' | 'voice' | 'image' | 'link'
  category: { id: string; name: string; description: string } | null
  tags: string[]
  resources: Resource[]
  file_path: string | null
  related_note_ids: string[]
  created_at: string
  title: string | null
  color: string | null
}

export interface SearchResult {
  notes: NoteResponse[]
}
