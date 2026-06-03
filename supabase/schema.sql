-- Drop tables if they exist (for a clean slate, careful if running on prod!)
-- DROP TABLE IF EXISTS notifications;
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

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS) for people
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own people" ON people FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own people" ON people FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own people" ON people FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own people" ON people FOR DELETE USING (auth.uid() = user_id);

-- Set up Row Level Security (RLS) for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);
