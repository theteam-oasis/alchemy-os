import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// ─── Client Operations ───

export async function createClient_db(name, color = '#FFD60A') {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('clients')
    .insert({ name, color, status: 'onboarding', stage: 'Intake Form', progress: 10 })
    .select()
    .single()
  if (error) { console.error('Create client error:', error); return null }
  return data
}

export async function getClients() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('Get clients error:', error); return [] }
  return data
}

export async function updateClient_db(id, updates) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('Update client error:', error); return null }
  return data
}

// ─── Brand Intake Operations ───

export async function getBrandIntake(clientId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('brand_intake')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error) { console.error('Get intake error:', error); return null }
  // Map DB columns back to formData shape
  return {
    brandName: data.brand_name,
    tagline: data.tagline,
    story: data.story,
    personality: data.personality_tags || [],
    website: data.website,
    formality: data.tone_formality,
    mood: data.tone_mood,
    intensity: data.tone_intensity,
    audience: data.audience_description,
    ageRange: data.age_range,
    competitors: data.competitors,
    deepestFears: data.deepest_fears,
    deepestDesires: data.deepest_desires,
    influencerAge: data.influencer_age,
    influencerGender: data.influencer_gender,
    influencerEthnicity: data.influencer_ethnicity,
    influencerBodyType: data.influencer_body_type,
    influencerHairColor: data.influencer_hair_color,
    influencerHairStyle: data.influencer_hair_style,
    influencerBeautyLevel: data.influencer_beauty_level,
    influencerStyle: data.influencer_style,
    influencerPersonality: data.influencer_personality,
    influencerNotes: data.influencer_notes,
    uniqueFeatures: data.unique_features || [],
    testimonials: data.testimonials || [],
    voiceStyle: data.voice_style || [],
    voiceGender: data.voice_gender,
    voiceAge: data.voice_age,
    voiceNotes: data.voice_notes,
    musicMood: data.music_mood || [],
    musicGenres: data.music_genres || [],
    musicNotes: data.music_notes,
    videoPace: data.video_pace,
    videoEnergy: data.video_energy,
    videoTransitions: data.video_transitions,
    videoCuts: data.video_cuts,
    videoNotes: data.video_notes,
    objective: data.objective,
    keyMessage: data.key_message,
    colors: data.brand_colors,
    productImages: (data.product_image_urls || []).map((url, i) => ({ url, name: `product-${i+1}` })),
  }
}

export async function getBrandHub(clientId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('brand_hub')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error) { console.error('Get brand hub error:', error); return null }
  return data
}

export async function saveBrandIntake(clientId, formData) {
  if (!supabase) return null
  const intake = {
    client_id: clientId,
    brand_name: formData.brandName,
    tagline: formData.tagline,
    story: formData.story,
    personality_tags: formData.personality,
    website: formData.website,
    tone_formality: formData.formality,
    tone_mood: formData.mood,
    tone_intensity: formData.intensity,
    audience_description: formData.audience,
    age_range: formData.ageRange,
    competitors: formData.competitors,
    deepest_fears: formData.deepestFears,
    deepest_desires: formData.deepestDesires,
    influencer_age: formData.influencerAge,
    influencer_gender: formData.influencerGender,
    influencer_ethnicity: formData.influencerEthnicity,
    influencer_body_type: formData.influencerBodyType,
    influencer_hair_color: formData.influencerHairColor,
    influencer_hair_style: formData.influencerHairStyle,
    influencer_beauty_level: formData.influencerBeautyLevel,
    influencer_style: formData.influencerStyle,
    influencer_personality: formData.influencerPersonality,
    influencer_notes: formData.influencerNotes,
    unique_features: (formData.uniqueFeatures || []).filter(Boolean),
    testimonials: (formData.testimonials || []).filter(Boolean),
    voice_style: formData.voiceStyle,
    voice_gender: formData.voiceGender,
    voice_age: formData.voiceAge,
    voice_notes: formData.voiceNotes,
    music_mood: formData.musicMood,
    music_genres: formData.musicGenres,
    music_notes: formData.musicNotes,
    video_pace: formData.videoPace,
    video_energy: formData.videoEnergy,
    video_transitions: formData.videoTransitions,
    video_cuts: formData.videoCuts,
    video_notes: formData.videoNotes,
    objective: formData.objective,
    key_message: formData.keyMessage,
    brand_colors: formData.colors,
  }
  const { data, error } = await supabase
    .from('brand_intake')
    .insert(intake)
    .select()
    .single()
  if (error) { console.error('Save intake error:', error); return null }
  return data
}

// ─── Brand Hub Operations ───

export async function saveBrandHub(clientId, guidelines, sectionStatuses) {
  if (!supabase) return null
  // Check if one already exists
  const { data: existing } = await supabase
    .from('brand_hub')
    .select('id')
    .eq('client_id', clientId)
    .limit(1)
    .single()
  
  if (existing) {
    const { data, error } = await supabase
      .from('brand_hub')
      .update({ guidelines, section_statuses: sectionStatuses })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) { console.error('Update brand hub error:', error); return null }
    return data
  } else {
    const { data, error } = await supabase
      .from('brand_hub')
      .insert({ client_id: clientId, guidelines, section_statuses: sectionStatuses })
      .select()
      .single()
    if (error) { console.error('Insert brand hub error:', error); return null }
    return data
  }
}

export async function lockBrandHub(clientId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('brand_hub')
    .update({ is_locked: true, locked_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .select()
    .single()
  if (error) { console.error('Lock brand hub error:', error); return null }
  return data
}

// ─── Notes Operations ───

export async function addNote(clientId, text) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('internal_notes')
    .insert({ client_id: clientId, note_text: text })
    .select()
    .single()
  if (error) { console.error('Add note error:', error); return null }
  return data
}

export async function getNotes(clientId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('internal_notes')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) { console.error('Get notes error:', error); return [] }
  return data
}

export async function deleteNote(noteId) {
  if (!supabase) return false
  const { error } = await supabase
    .from('internal_notes')
    .delete()
    .eq('id', noteId)
  if (error) { console.error('Delete note error:', error); return false }
  return true
}

// ─── File Upload ───

export async function uploadProductImage(clientId, file) {
  if (!supabase) return null
  const ext = file.name.split('.').pop()
  const path = `${clientId}/${Date.now()}.${ext}`
  const { data, error } = await supabase.storage
    .from('brand-assets')
    .upload(path, file)
  if (error) { console.error('Upload error:', error); return null }
  const { data: { publicUrl } } = supabase.storage
    .from('brand-assets')
    .getPublicUrl(path)
  return publicUrl
}
