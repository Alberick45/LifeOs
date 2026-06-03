-- Drop tables if they exist (for a clean slate, careful if running on prod!)
-- DROP TABLE IF EXISTS people;

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- People Table
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    birthday DATE,
    photo TEXT,
    relationship_type TEXT,
    status TEXT,
    strength_score INT DEFAULT 50,
    trust_score INT DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS) for people
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only select their own people
CREATE POLICY "Users can view their own people" 
ON people FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own people
CREATE POLICY "Users can insert their own people" 
ON people FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own people
CREATE POLICY "Users can update their own people" 
ON people FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy: Users can only delete their own people
CREATE POLICY "Users can delete their own people" 
ON people FOR DELETE 
USING (auth.uid() = user_id);
