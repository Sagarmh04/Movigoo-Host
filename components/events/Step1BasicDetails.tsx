"use client";

import { useState, useEffect } from "react";
import { Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventFormData, ValidationError } from "@/lib/types/event";
import { processImage, IMAGE_PRESETS, validateImageFile, revokePreviewUrl, ProcessedImage } from "@/lib/utils/imageProcessor";
import { uploadToFirebaseStorage, generateCoverImagePath, UploadProgress } from "@/lib/utils/firebaseUpload";
import { Loader2, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface Step1BasicDetailsProps {
  data: Partial<EventFormData>;
  onChange: (data: Partial<EventFormData>) => void;
  errors: ValidationError[];
}

const GENRE_OPTIONS = [
  "Music",
  "Standup",
  "Workshop",
  "Tech",
  "Sports",
  "Theater",
  "Dance",
  "Food & Drink",
  "Art",
  "Business",
  "Other",
];

const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Kannada",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Other",
];

const AGE_LIMIT_OPTIONS = [
  { value: "all", label: "All ages" },
  { value: "13", label: "13+" },
  { value: "16", label: "16+" },
  { value: "18", label: "18+" },
  { value: "21", label: "21+" },
];

export default function Step1BasicDetails({ data, onChange, errors }: Step1BasicDetailsProps) {
  const [titleCharCount, setTitleCharCount] = useState(data.title?.length || 0);
  const [uploadingWide, setUploadingWide] = useState(false);
  const [uploadingPortrait, setUploadingPortrait] = useState(false);
  const [wideProgress, setWideProgress] = useState(0);
  const [portraitProgress, setPortraitProgress] = useState(0);
  const [wideError, setWideError] = useState<string | null>(null);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [widePreview, setWidePreview] = useState<string | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);

  const getError = (field: string) => errors.find((e) => e.field === field)?.message;

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (widePreview) revokePreviewUrl(widePreview);
      if (portraitPreview) revokePreviewUrl(portraitPreview);
    };
  }, [widePreview, portraitPreview]);

  const handleTitleChange = (value: string) => {
    setTitleCharCount(value.length);
    onChange({ ...data, title: value });
  };

  const handleGenreToggle = (genre: string) => {
    const currentGenres = data.genres || [];
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter((g) => g !== genre)
      : [...currentGenres, genre];
    onChange({ ...data, genres: newGenres });
  };

  const handleLanguageToggle = (language: string) => {
    const currentLanguages = data.languages || [];
    const newLanguages = currentLanguages.includes(language)
      ? currentLanguages.filter((l) => l !== language)
      : [...currentLanguages, language];
    onChange({ ...data, languages: newLanguages });
  };

  const handleFileUpload = async (file: File, type: "wide" | "portrait") => {
    const setUploading = type === "wide" ? setUploadingWide : setUploadingPortrait;
    const setProgress = type === "wide" ? setWideProgress : setPortraitProgress;
    const setError = type === "wide" ? setWideError : setPortraitError;
    const setPreview = type === "wide" ? setWidePreview : setPortraitPreview;
    const currentPreview = type === "wide" ? widePreview : portraitPreview;

    // Reset state
    setError(null);
    setProgress(0);
    setUploading(true);

    try {
      // Step 1: Validate file
      const validation = validateImageFile(file, 10);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid file");
      }

      console.log(`📸 [${type.toUpperCase()}] Processing: ${file.name}`);

      // Step 2: Process image (resize & crop)
      const preset = type === "wide" ? IMAGE_PRESETS.WIDE : IMAGE_PRESETS.PORTRAIT;
      const processed: ProcessedImage = await processImage(file, preset);

      // Clean up old preview
      if (currentPreview) {
        revokePreviewUrl(currentPreview);
      }

      // Set preview immediately
      setPreview(processed.preview);

      console.log(`🔄 [${type.toUpperCase()}] Image processed, uploading to Firebase...`);

      // Step 3: Upload to Firebase Storage
      const path = generateCoverImagePath(null, type, file.name);
      const result = await uploadToFirebaseStorage(processed.blob, path, {
        onProgress: (progress: UploadProgress) => {
          setProgress(progress.percentage);
        },
        onError: (error: Error) => {
          setError(error.message);
        },
      });

      // Step 4: Update form data with download URL
      if (type === "wide") {
        onChange({ ...data, coverPhotoWide: result.url });
      } else {
        onChange({ ...data, coverPhotoPortrait: result.url });
      }

      console.log(`✅ [${type.toUpperCase()}] Upload complete: ${result.url}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload image";
      setError(errorMessage);
      console.error(`❌ [${type.toUpperCase()}] Error:`, err);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemovePhoto = (type: "wide" | "portrait") => {
    const preview = type === "wide" ? widePreview : portraitPreview;
    
    // Clean up preview URL
    if (preview) {
      revokePreviewUrl(preview);
      if (type === "wide") {
        setWidePreview(null);
      } else {
        setPortraitPreview(null);
      }
    }

    // Clear form data
    if (type === "wide") {
      onChange({ ...data, coverPhotoWide: "" });
      setWideError(null);
      setWideProgress(0);
    } else {
      onChange({ ...data, coverPhotoPortrait: "" });
      setPortraitError(null);
      setPortraitProgress(0);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Event Title */}
        <div className="space-y-2" data-field="title">
          <Label htmlFor="title">Event Title *</Label>
          <Input
            id="title"
            name="title"
            placeholder="Enter event title"
            value={data.title || ""}
            onChange={(e) => handleTitleChange(e.target.value)}
            maxLength={50}
            className={getError("title") ? "border-red-500" : ""}
          />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Max 50 characters</span>
            <span className={titleCharCount > 50 ? "text-red-500" : "text-muted-foreground"}>
              {titleCharCount} / 50
            </span>
          </div>
          {getError("title") && <p className="text-sm text-red-500">{getError("title")}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2" data-field="description">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Describe your event, what happens, and why people should attend..."
            value={data.description || ""}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            rows={6}
            className={getError("description") ? "border-red-500" : ""}
          />
          {getError("description") && <p className="text-sm text-red-500">{getError("description")}</p>}
        </div>

        {/* Genres */}
        <div className="space-y-2" data-field="genres">
          <Label>Genres *</Label>
          <p className="text-xs text-muted-foreground mb-2">You can select more than one</p>
          <div className="flex flex-wrap gap-2">
            {GENRE_OPTIONS.map((genre) => (
              <Badge
                key={genre}
                variant={(data.genres || []).includes(genre) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => handleGenreToggle(genre)}
              >
                {genre}
              </Badge>
            ))}
          </div>
          {getError("genres") && <p className="text-sm text-red-500 mt-2">{getError("genres")}</p>}
        </div>

        {/* Languages */}
        <div className="space-y-2" data-field="languages">
          <Label>Languages *</Label>
          <p className="text-xs text-muted-foreground mb-2">You can select more than one</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((language) => (
              <Badge
                key={language}
                variant={(data.languages || []).includes(language) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => handleLanguageToggle(language)}
              >
                {language}
              </Badge>
            ))}
          </div>
          {getError("languages") && <p className="text-sm text-red-500 mt-2">{getError("languages")}</p>}
        </div>

        {/* Age Limit */}
        <div className="space-y-2" data-field="ageLimit">
          <Label htmlFor="ageLimit">Age Limit *</Label>
          <Select
            value={String(data.ageLimit || "")}
            onValueChange={(value) => onChange({ ...data, ageLimit: value })}
          >
            <SelectTrigger id="ageLimit" className={getError("ageLimit") ? "border-red-500" : ""}>
              <SelectValue placeholder="Select age limit" />
            </SelectTrigger>
            <SelectContent>
              {AGE_LIMIT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getError("ageLimit") && <p className="text-sm text-red-500">{getError("ageLimit")}</p>}
        </div>

        {/* Duration */}
        <div className="space-y-2" data-field="duration">
          <Label htmlFor="duration">Duration *</Label>
          <div className="flex gap-2">
            <Input
              id="duration"
              name="duration"
              type="number"
              min="1"
              placeholder="90"
              value={data.duration || ""}
              onChange={(e) => onChange({ ...data, duration: Number(e.target.value) })}
              className={`flex-1 ${getError("duration") ? "border-red-500" : ""}`}
            />
            <Select
              value={data.durationUnit || "minutes"}
              onValueChange={(value: "minutes" | "hours") => onChange({ ...data, durationUnit: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {getError("duration") && <p className="text-sm text-red-500">{getError("duration")}</p>}
        </div>

        {/* Terms & Conditions */}
        <div className="space-y-3 p-4 border rounded-lg" data-field="termsAccepted">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Platform Terms & Conditions</h4>
            <div className="text-xs text-muted-foreground p-3 bg-muted rounded max-h-32 overflow-y-auto">
              <p>By hosting an event on Movigoo, you agree to:</p>
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Provide accurate event information</li>
                <li>Deliver the event as described</li>
                <li>Follow all local laws and regulations</li>
                <li>Maintain a safe environment for attendees</li>
                <li>Handle refunds according to platform policies</li>
              </ul>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="termsAccepted"
              checked={data.termsAccepted || false}
              onCheckedChange={(checked) => onChange({ ...data, termsAccepted: checked as boolean })}
            />
            <Label htmlFor="termsAccepted" className="text-sm font-normal cursor-pointer">
              I confirm that this event follows Movigoo policies and terms of service *
            </Label>
          </div>
          {getError("termsAccepted") && <p className="text-sm text-red-500">{getError("termsAccepted")}</p>}
        </div>
      </div>

      {/* Right Column - Cover Photos */}
      <div className="space-y-6">
        {/* Wide Cover Photo */}
        <div className="space-y-2" data-field="coverPhotoWide">
          <Label>Cover Photo – Wide (16:9) *</Label>
          <p className="text-xs text-muted-foreground">Auto-resized to 1920×1080px • PNG, JPG up to 10MB</p>
          
          {!data.coverPhotoWide && !widePreview ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                id="wide-upload"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                disabled={uploadingWide}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, "wide");
                }}
              />
              <label htmlFor="wide-upload" className={uploadingWide ? "cursor-wait" : "cursor-pointer"}>
                {uploadingWide ? (
                  <Loader2 className="mx-auto h-12 w-12 text-primary mb-4 animate-spin" />
                ) : (
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                )}
                <p className="text-sm font-medium mb-1">
                  {uploadingWide ? "Processing & Uploading..." : "Click to upload or drag and drop"}
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG • Auto-cropped & compressed</p>
              </label>
              {uploadingWide && wideProgress > 0 && (
                <div className="mt-4 space-y-2">
                  <Progress value={wideProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{Math.round(wideProgress)}% uploaded</p>
                </div>
              )}
            </div>
          ) : (
            <div className="relative border rounded-lg overflow-hidden">
              <img
                src={widePreview || data.coverPhotoWide}
                alt="Wide cover"
                className="w-full h-48 object-cover"
                style={{ aspectRatio: "16/9" }}
              />
              {uploadingWide && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">{Math.round(wideProgress)}%</p>
                  </div>
                </div>
              )}
              {!uploadingWide && (
                <>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => document.getElementById("wide-upload-replace")?.click()}
                    >
                      Replace
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemovePhoto("wide")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {data.coverPhotoWide && (
                    <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Uploaded
                    </div>
                  )}
                </>
              )}
              <input
                type="file"
                id="wide-upload-replace"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                disabled={uploadingWide}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, "wide");
                }}
              />
            </div>
          )}
          
          {/* Error Display */}
          {wideError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{wideError}</AlertDescription>
            </Alert>
          )}
          
          {getError("coverPhotoWide") && <p className="text-sm text-red-500">{getError("coverPhotoWide")}</p>}
        </div>

        {/* Portrait Cover Photo */}
        <div className="space-y-2" data-field="coverPhotoPortrait">
          <Label>Cover Photo – Portrait (9:16) *</Label>
          <p className="text-xs text-muted-foreground">Auto-resized to 1080×1920px • PNG, JPG up to 10MB</p>
          
          {!data.coverPhotoPortrait && !portraitPreview ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors max-w-xs mx-auto">
              <input
                type="file"
                id="portrait-upload"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                disabled={uploadingPortrait}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, "portrait");
                }}
              />
              <label htmlFor="portrait-upload" className={uploadingPortrait ? "cursor-wait" : "cursor-pointer"}>
                {uploadingPortrait ? (
                  <Loader2 className="mx-auto h-12 w-12 text-primary mb-4 animate-spin" />
                ) : (
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                )}
                <p className="text-sm font-medium mb-1">
                  {uploadingPortrait ? "Processing & Uploading..." : "Click to upload or drag and drop"}
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG • Auto-cropped & compressed</p>
              </label>
              {uploadingPortrait && portraitProgress > 0 && (
                <div className="mt-4 space-y-2">
                  <Progress value={portraitProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{Math.round(portraitProgress)}% uploaded</p>
                </div>
              )}
            </div>
          ) : (
            <div className="relative border rounded-lg overflow-hidden max-w-xs mx-auto">
              <img
                src={portraitPreview || data.coverPhotoPortrait}
                alt="Portrait cover"
                className="w-full h-64 object-cover"
                style={{ aspectRatio: "9/16" }}
              />
              {uploadingPortrait && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">{Math.round(portraitProgress)}%</p>
                  </div>
                </div>
              )}
              {!uploadingPortrait && (
                <>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => document.getElementById("portrait-upload-replace")?.click()}
                    >
                      Replace
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemovePhoto("portrait")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {data.coverPhotoPortrait && (
                    <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Uploaded
                    </div>
                  )}
                </>
              )}
              <input
                type="file"
                id="portrait-upload-replace"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                disabled={uploadingPortrait}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, "portrait");
                }}
              />
            </div>
          )}
          
          {/* Error Display */}
          {portraitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{portraitError}</AlertDescription>
            </Alert>
          )}
          
          {getError("coverPhotoPortrait") && <p className="text-sm text-red-500">{getError("coverPhotoPortrait")}</p>}
        </div>
      </div>
    </div>
  );
}
