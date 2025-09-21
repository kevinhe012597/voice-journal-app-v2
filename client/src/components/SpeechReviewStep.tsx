import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit3, Wand2, RotateCcw } from 'lucide-react';

interface SpeechReviewStepProps {
  capturedText: string;
  onProcessText: (text: string) => void;
  onReRecord: () => void;
  isProcessing: boolean;
}

export default function SpeechReviewStep({ 
  capturedText, 
  onProcessText, 
  onReRecord, 
  isProcessing 
}: SpeechReviewStepProps) {
  const [editedText, setEditedText] = useState(capturedText);
  const [isEditing, setIsEditing] = useState(false);

  const handleProcess = () => {
    onProcessText(editedText);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(capturedText);
    setIsEditing(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Review Captured Speech
            <Badge variant="secondary" className="text-xs">
              {capturedText.length} characters
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReRecord}
            disabled={isProcessing}
            data-testid="button-re-record"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Re-record
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Display captured text */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Captured Speech:
          </h4>
          
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="Edit your captured speech here..."
                className="min-h-32 resize-none"
                data-testid="textarea-edit-speech"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} data-testid="button-save-edit">
                  Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit} data-testid="button-cancel-edit">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-md border">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-captured-speech">
                  {editedText || "No speech captured yet..."}
                </p>
              </div>
              
              {editedText && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  disabled={isProcessing}
                  data-testid="button-edit-text"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Text
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isEditing && editedText && (
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleProcess}
              disabled={isProcessing || !editedText.trim()}
              className="flex-1"
              data-testid="button-process-to-bullets"
            >
              {isProcessing ? (
                <>
                  <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Process into Bullet Points
                </>
              )}
            </Button>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Review your captured speech above. You can edit the text if needed, then click "Process into Bullet Points" to convert it into organized journal entries.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}