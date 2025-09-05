-- Add selected_prompt_id field to wordpress_sites table
ALTER TABLE wordpress_sites 
ADD COLUMN IF NOT EXISTS selected_prompt_id TEXT;