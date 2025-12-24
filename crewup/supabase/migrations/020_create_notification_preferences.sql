-- Create notification_preferences table
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  application_status_changes BOOLEAN DEFAULT TRUE,
  new_applications BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  email_digest TEXT DEFAULT 'immediate' CHECK (email_digest IN ('immediate', 'daily', 'weekly', 'never')),
  desktop_notifications BOOLEAN DEFAULT TRUE,
  notification_sound BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own preferences
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to auto-create preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on profile creation
CREATE TRIGGER on_profile_created_create_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();
