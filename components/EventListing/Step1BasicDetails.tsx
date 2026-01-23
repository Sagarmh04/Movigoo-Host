"use client";

import { UseFormReturn } from "react-hook-form";
import { EventFormData } from "./EventListing";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Image as ImageIcon, Loader2, AlertCircle, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { processImage, IMAGE_PRESETS, validateImageFile, revokePreviewUrl } from "@/lib/utils/imageProcessor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface Step1BasicDetailsProps {
  form: UseFormReturn<EventFormData>;
}

export default function Step1BasicDetails({ form }: Step1BasicDetailsProps) {
  const [coverWidePreview, setCoverWidePreview] = useState<string | null>(null);
  const [coverPortraitPreview, setCoverPortraitPreview] = useState<string | null>(null);
  const [uploadingWide, setUploadingWide] = useState(false);
  const [uploadingPortrait, setUploadingPortrait] = useState(false);
  const [wideError, setWideError] = useState<string | null>(null);
  const [portraitError, setPortraitError] = useState<string | null>(null);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (coverWidePreview) revokePreviewUrl(coverWidePreview);
      if (coverPortraitPreview) revokePreviewUrl(coverPortraitPreview);
    };
  }, [coverWidePreview, coverPortraitPreview]);

  // Handle cover wide photo upload (16:9)
  const handleCoverWideChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWideError(null);
    setUploadingWide(true);

    try {
      // Validate file
      const validation = validateImageFile(file, 10);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid file");
      }

      console.log(`📸 [Wide Cover] Processing: ${file.name}`);

      // Process image (resize & crop to 1920×1080)
      const processed = await processImage(file, IMAGE_PRESETS.WIDE);

      // Clean up old preview
      if (coverWidePreview) {
        revokePreviewUrl(coverWidePreview);
      }

      // Set preview
      setCoverWidePreview(processed.preview);

      // Create File from Blob for form
      const resizedFile = new File([processed.blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      // Store processed file in form
      form.setValue("coverWide", resizedFile, { shouldValidate: true });

      console.log(`✅ [Wide Cover] Processed: ${processed.dimensions.width}×${processed.dimensions.height}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process image";
      setWideError(errorMessage);
      console.error("❌ [Wide Cover] Error:", error);
    } finally {
      setUploadingWide(false);
    }
  };

  // Handle portrait photo upload (9:16)
  const handleCoverPortraitChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPortraitError(null);
    setUploadingPortrait(true);

    try {
      // Validate file
      const validation = validateImageFile(file, 10);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid file");
      }

      console.log(`📸 [Portrait Cover] Processing: ${file.name}`);

      // Process image (resize & crop to 1080×1920)
      const processed = await processImage(file, IMAGE_PRESETS.PORTRAIT);

      // Clean up old preview
      if (coverPortraitPreview) {
        revokePreviewUrl(coverPortraitPreview);
      }

      // Set preview
      setCoverPortraitPreview(processed.preview);

      // Create File from Blob for form
      const resizedFile = new File([processed.blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      // Store processed file in form
      form.setValue("coverPortrait", resizedFile, { shouldValidate: true });

      console.log(`✅ [Portrait Cover] Processed: ${processed.dimensions.width}×${processed.dimensions.height}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process image";
      setPortraitError(errorMessage);
      console.error("❌ [Portrait Cover] Error:", error);
    } finally {
      setUploadingPortrait(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Basic Details</h2>
        <p className="text-sm text-muted-foreground">
          Provide the essential information about your event.
        </p>
      </div>

      <div className="space-y-6">
          {/* Event Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Title *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter event title (max 50 characters)"
                    maxLength={50}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {field.value?.length || 0}/50 characters
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cover Photo (Wide) */}
          <FormField
            control={form.control}
            name="coverWide"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cover Photo (Wide 16:9) *</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleCoverWideChange}
                      className="hidden"
                      id="coverWide-upload"
                      disabled={uploadingWide}
                    />
                    <label htmlFor="coverWide-upload">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full cursor-pointer"
                        disabled={uploadingWide}
                        asChild
                      >
                        <span className="flex items-center justify-center gap-2">
                          {uploadingWide ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : coverWidePreview ? (
                            <>
                              <Check className="h-4 w-4" />
                              Replace Wide Cover Photo
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload Wide Cover Photo
                            </>
                          )}
                        </span>
                      </Button>
                    </label>

                    {/* Error Alert */}
                    {wideError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{wideError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Preview */}
                    {coverWidePreview && (
                      <Card className="mt-2">
                        <CardContent className="p-2">
                          <img
                            src={coverWidePreview}
                            alt="Cover wide preview"
                            className="w-full h-48 object-cover rounded"
                            style={{ aspectRatio: "16/9" }}
                          />
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            ✅ Auto-resized to 1920×1080 (16:9)
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* File info without preview */}
                    {field.value && !coverWidePreview && !uploadingWide && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        {(field.value as File)?.name}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Auto-resized to 1920×1080px • PNG, JPG up to 10MB • Auto-cropped & compressed
                    </p>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Portrait Photo */}
          <FormField
            control={form.control}
            name="coverPortrait"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Portrait Photo (9:16) *</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleCoverPortraitChange}
                      className="hidden"
                      id="coverPortrait-upload"
                      disabled={uploadingPortrait}
                    />
                    <label htmlFor="coverPortrait-upload">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full cursor-pointer"
                        disabled={uploadingPortrait}
                        asChild
                      >
                        <span className="flex items-center justify-center gap-2">
                          {uploadingPortrait ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : coverPortraitPreview ? (
                            <>
                              <Check className="h-4 w-4" />
                              Replace Portrait Photo
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload Portrait Photo
                            </>
                          )}
                        </span>
                      </Button>
                    </label>

                    {/* Error Alert */}
                    {portraitError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{portraitError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Preview */}
                    {coverPortraitPreview && (
                      <Card className="mt-2">
                        <CardContent className="p-2">
                          <img
                            src={coverPortraitPreview}
                            alt="Portrait preview"
                            className="w-32 h-56 object-cover rounded mx-auto"
                            style={{ aspectRatio: "9/16" }}
                          />
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            ✅ Auto-resized to 1080×1920 (9:16)
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* File info without preview */}
                    {field.value && !coverPortraitPreview && !uploadingPortrait && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        {(field.value as File)?.name}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Auto-resized to 1080×1920px • PNG, JPG up to 10MB • Auto-cropped & compressed
                    </p>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Genre */}
          <FormField
            control={form.control}
            name="genre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Genre *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="DJ">DJ</SelectItem>
                    <SelectItem value="Festival">Festival</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Comedy">Comedy</SelectItem>
                    <SelectItem value="Theatre">Theatre</SelectItem>
                    <SelectItem value="Conference">Conference</SelectItem>
                    <SelectItem value="Workshop">Workshop</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Language */}
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Language *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Kannada">Kannada</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Multi">Multi</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Age Limit */}
          <FormField
            control={form.control}
            name="ageLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age Limit *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select age limit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="All ages">All ages</SelectItem>
                    <SelectItem value="12+">12+</SelectItem>
                    <SelectItem value="16+">16+</SelectItem>
                    <SelectItem value="18+">18+</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Duration */}
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 2 hours, 1 day" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the duration of the event (e.g., 2 hours, 1 day)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Terms & Conditions */}
          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Terms & Conditions </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter terms and conditions for the event"
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
    </div>
  );
}
