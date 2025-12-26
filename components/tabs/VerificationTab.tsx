"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getStorage } from "firebase/storage";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, X, CheckCircle2, Clock, XCircle, FileText } from "lucide-react";

interface DocumentUpload {
  id: string;
  type: string;
  file: File | null;
  url: string;
  uploading: boolean;
}

interface KycStatus {
  kycStatus: string;
  kycSubmittedAt: number | null;
  kycDetails: any;
}

interface VerificationTabProps {
  onKycStatusChange?: () => void;
}

export default function VerificationTab({ onKycStatusChange }: VerificationTabProps = {}) {
  const [loading, setLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { id: "1", type: "", file: null, url: "", uploading: false }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const storage = getStorage();

  useEffect(() => {
    loadKycStatus();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data()?.profile || {};
        setName(profile.name || "");
        setEmail(profile.email || user.email || "");
        setPhone(profile.phone || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadKycStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL}/getKycStatus`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setKycStatus(data);
      }
    } catch (error) {
      console.error("Error loading KYC status:", error);
    }
  };

  const addDocument = () => {
    if (documents.length >= 3) {
      toast.error("Maximum 3 documents allowed");
      return;
    }
    setDocuments([
      ...documents,
      { id: Date.now().toString(), type: "", file: null, url: "", uploading: false }
    ]);
  };

  const removeDocument = (id: string) => {
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  const handleFileSelect = async (id: string, file: File | null) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only images (JPG, PNG) and PDF files are allowed");
      return;
    }

    // Validate file size (8MB)
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File size must be less than 8MB");
      return;
    }

    // Update document with file
    setDocuments(docs =>
      docs.map(doc => (doc.id === id ? { ...doc, file, uploading: true } : doc))
    );

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Upload to Firebase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `kyc/${user.uid}/${fileName}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update document with URL
      setDocuments(docs =>
        docs.map(doc =>
          doc.id === id ? { ...doc, url: downloadURL, uploading: false } : doc
        )
      );

      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
      setDocuments(docs =>
        docs.map(doc => (doc.id === id ? { ...doc, uploading: false, file: null } : doc))
      );
    }
  };

  const handleDocumentTypeChange = (id: string, type: string) => {
    setDocuments(docs =>
      docs.map(doc => (doc.id === id ? { ...doc, type } : doc))
    );
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    // Validate at least one document
    const validDocuments = documents.filter(doc => doc.type && doc.url);
    if (validDocuments.length === 0) {
      toast.error("Please upload at least one document");
      return;
    }

    // Validate all uploaded documents have types
    const uploadedDocs = documents.filter(doc => doc.url);
    const missingTypes = uploadedDocs.some(doc => !doc.type);
    if (missingTypes) {
      toast.error("Please select document type for all uploaded files");
      return;
    }

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const idToken = await user.getIdToken();
      const response = await fetch(
      "https://submitkyc-nmi75xl45a-el.a.run.app",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            name: name.trim(),
            email: email.trim() || null,
            phone: phone.trim() || null,
            documents: validDocuments.map(doc => ({
              type: doc.type,
              url: doc.url,
            })),
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "KYC submitted successfully!");
        await loadKycStatus();
        // Notify parent to refresh KYC status
        if (onKycStatusChange) {
          onKycStatusChange();
        }
      } else {
        toast.error(data.message || data.error || "Failed to submit KYC");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    if (!kycStatus) return null;

    switch (kycStatus.kycStatus) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="w-4 h-4 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            <XCircle className="w-4 h-4 mr-1" />
            Not Submitted
          </Badge>
        );
    }
  };

  const isVerified = kycStatus?.kycStatus === "verified";
  const isPending = kycStatus?.kycStatus === "pending";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">KYC Verification</h1>
        <p className="text-gray-500 mt-1">
          Complete your KYC to access all features of the platform.
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Verification Status</CardTitle>
            {getStatusBadge()}
          </div>
          <CardDescription>
            {isVerified && "Your account is verified and you have full access to all features."}
            {isPending && "Your KYC documents are under review. You can access the dashboard while waiting."}
            {!isVerified && !isPending && "Please submit your KYC documents to verify your account."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* KYC Form */}
      {isVerified ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-green-600">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-semibold">Your KYC is verified!</p>
              <p className="text-sm text-gray-500 mt-2">No need to submit documents again.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Submit KYC Documents</CardTitle>
            <CardDescription>
              Upload your identity documents (Aadhar, Voter ID, Driving License, Passport, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Personal Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Document Uploads */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Documents (Max 3)</h3>
                {documents.length < 3 && !isPending && (
                  <Button type="button" variant="outline" size="sm" onClick={addDocument}>
                    Add Document
                  </Button>
                )}
              </div>

              {documents.map((doc, index) => (
                <div key={doc.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Document {index + 1}</Label>
                    {documents.length > 1 && !isPending && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Document Type *</Label>
                      <Select
                        value={doc.type}
                        onValueChange={(value) => handleDocumentTypeChange(doc.id, value)}
                        disabled={isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aadhar">Aadhar Card</SelectItem>
                          <SelectItem value="voter_id">Voter ID</SelectItem>
                          <SelectItem value="driving_license">Driving License</SelectItem>
                          <SelectItem value="passport">Passport</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Document (Max 8MB) *</Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileSelect(doc.id, e.target.files?.[0] || null)}
                          disabled={doc.uploading || isPending}
                          className="flex-1"
                        />
                        {doc.uploading && (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {doc.url && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <FileText className="w-4 h-4" />
                      <span>File uploaded successfully</span>
                    </div>
                  )}
                </div>
              ))}

              <p className="text-sm text-gray-500">
                * Accepted formats: JPG, PNG, PDF (Max size: 8MB per file)
              </p>
            </div>

            {!isPending && (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? "Submitting..." : "Submit KYC for Verification"}
              </Button>
            )}

            {isPending && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-800 font-medium">
                  Your KYC is pending verification by our team.
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  You can access the dashboard while we review your documents.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
