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
import { Upload, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

interface Step1BasicDetailsProps {
  form: UseFormReturn<EventFormData>;
}

export default function Step1BasicDetails({ form }: Step1BasicDetailsProps) {
  const [coverWidePreview, setCoverWidePreview] = useState<string | null>(null);
  const [coverPortraitPreview, setCoverPortraitPreview] = useState<string | null>(null);

  // Handle cover wide photo upload
  const handleCoverWideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("coverWide", file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverWidePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle portrait photo upload
  const handleCoverPortraitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("coverPortrait", file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPortraitPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
                <FormLabel>Cover Photo (Wide) *</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverWideChange}
                      className="hidden"
                      id="coverWide-upload"
                    />
                    <label htmlFor="coverWide-upload">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full cursor-pointer"
                        asChild
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Upload className="h-4 w-4" />
                          Upload Wide Cover Photo
                        </span>
                      </Button>
                    </label>
                    {coverWidePreview && (
                      <Card className="mt-2">
                        <CardContent className="p-2">
                          <img
                            src={coverWidePreview}
                            alt="Cover wide preview"
                            className="w-full h-32 object-cover rounded"
                          />
                        </CardContent>
                      </Card>
                    )}
                    {field.value && !coverWidePreview && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        {(field.value as File)?.name}
                      </p>
                    )}
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
                <FormLabel>Portrait Photo *</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverPortraitChange}
                      className="hidden"
                      id="coverPortrait-upload"
                    />
                    <label htmlFor="coverPortrait-upload">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full cursor-pointer"
                        asChild
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Upload className="h-4 w-4" />
                          Upload Portrait Photo
                        </span>
                      </Button>
                    </label>
                    {coverPortraitPreview && (
                      <Card className="mt-2">
                        <CardContent className="p-2">
                          <img
                            src={coverPortraitPreview}
                            alt="Portrait preview"
                            className="w-24 h-32 object-cover rounded mx-auto"
                          />
                        </CardContent>
                      </Card>
                    )}
                    {field.value && !coverPortraitPreview && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        {(field.value as File)?.name}
                      </p>
                    )}
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
