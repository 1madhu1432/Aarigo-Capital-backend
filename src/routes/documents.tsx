import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FolderLock,
  Search,
  FileText,
  Download,
  Trash2,
  FileCheck,
  UploadCloud,
  Plus,
  Filter,
  Eye,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { fmtDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import type { DocumentFile } from "@/types";

export const Route = createFileRoute("/documents")({
  component: DocumentsPage,
});

const DOC_TYPES: DocumentFile["type"][] = [
  "ID Proof",
  "Address Proof",
  "PAN",
  "Loan Agreement",
  "Photograph",
  "Guarantor Document",
  "Other",
];

function DocumentsPage() {
  const { documents, customers, addDocument, deleteDocument } = useStore();
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);

  // Form state for upload
  const [uploadCustomerId, setUploadCustomerId] = useState("");
  const [uploadType, setUploadType] = useState<DocumentFile["type"]>("ID Proof");
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const customer = customers.find((c) => c.id === d.customerId);
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        customer?.name.toLowerCase().includes(q) ||
        customer?.id.toLowerCase().includes(q);
      const matchesType = selectedType === "all" || d.type === selectedType;
      return matchesQuery && matchesType;
    });
  }, [documents, customers, query, selectedType]);

  const handleOpenUpload = () => {
    if (customers.length > 0 && !uploadCustomerId) {
      setUploadCustomerId(customers[0]?.id ?? "");
    }
    setUploadDocName("");
    setUploadFile(null);
    setUploadError("");
    setShowUploadDialog(true);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCustomerId) {
      setUploadError("Please select a borrower");
      return;
    }
    const name = uploadDocName.trim() || uploadFile?.name || `${uploadType} - Document`;
    addDocument(uploadCustomerId, uploadType, name);
    toast.success(`Uploaded "${name}" successfully`);
    setShowUploadDialog(false);
  };

  const handleSimulateDownload = (doc: DocumentFile) => {
    // Create a mock text file download to simulate document retrieval
    const content = `LoanFlow Hub Document Archive\nDocument ID: ${doc.id}\nCustomer ID: ${doc.customerId}\nType: ${doc.type}\nFile Name: ${doc.name}\nUploaded: ${doc.uploadedAt}\nSize: ${doc.sizeKb} KB\n\n[Verified Secure KYC Document Content]`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.name.replace(/\.[^/.]+$/, "")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${doc.name}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Borrower Documents Repository
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            KYC proofs, Aadhaar/PAN cards, loan agreements, and verification files
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold">
            {documents.length} Files Archived
          </Badge>
          <Button size="sm" onClick={handleOpenUpload} className="text-xs h-9 cursor-pointer">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by file name, document type, or customer..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-48 text-xs h-9">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Categories</SelectItem>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={FolderLock}
              title="No documents found"
              description={query || selectedType !== "all" ? "Try adjusting your search filters." : "Upload your first borrower KYC or agreement document."}
              action={{ label: "Upload Document", onClick: handleOpenUpload }}
            />
          ) : (
            <div className="divide-y divide-border/60 text-xs">
              {filtered.map((d) => {
                const customer = customers.find((c) => c.id === d.customerId);
                return (
                  <div
                    key={d.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5 sm:mt-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">{d.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {d.type}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                          <span>
                            Borrower: <strong className="text-foreground">{customer?.name ?? "Unknown"}</strong> ({d.customerId})
                          </span>
                          <span>•</span>
                          <span>{d.sizeKb} KB</span>
                          <span>•</span>
                          <span>Uploaded {fmtDate(d.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewDoc(d)}
                        className="h-8 text-xs cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSimulateDownload(d)}
                        className="h-8 text-xs cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          deleteDocument(d.id);
                          toast.success("Document removed");
                        }}
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Document Modal */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-primary" />
              Upload Borrower Document
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Attach a digital file or record an official KYC / loan document for a customer.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="customer-select" className="text-xs">Borrower *</Label>
              <Select value={uploadCustomerId} onValueChange={setUploadCustomerId}>
                <SelectTrigger id="customer-select" className="text-xs h-9">
                  <SelectValue placeholder="Select borrower..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} ({c.id}) - {c.mobile}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-type" className="text-xs">Document Type *</Label>
              <Select value={uploadType} onValueChange={(v) => setUploadType(v as DocumentFile["type"])}>
                <SelectTrigger id="doc-type" className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-name" className="text-xs">Document Name / Title</Label>
              <Input
                id="doc-name"
                placeholder="e.g. Aadhaar Card Front & Back"
                value={uploadDocName}
                onChange={(e) => setUploadDocName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-file" className="text-xs">Attach File (PDF, PNG, JPG)</Label>
              <Input
                id="doc-file"
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setUploadFile(f);
                    if (!uploadDocName) setUploadDocName(f.name);
                  }
                }}
                className="text-xs h-9 file:mr-2 file:text-xs file:font-semibold"
              />
            </div>

            {uploadError && (
              <p className="text-destructive text-[11px] font-medium">{uploadError}</p>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowUploadDialog(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs cursor-pointer">
                Upload & Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-md">
          {previewDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  {previewDoc.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Document ID: {previewDoc.id} • Category: {previewDoc.type}
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-lg bg-muted/40 border border-border/80 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Associated Customer:</span>
                  <strong className="text-foreground font-medium">
                    {customers.find((c) => c.id === previewDoc.customerId)?.name ?? previewDoc.customerId}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uploaded Date:</span>
                  <span className="text-foreground">{fmtDate(previewDoc.uploadedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approx Size:</span>
                  <span className="font-mono text-foreground">{previewDoc.sizeKb} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verification Status:</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                    Verified Digital Record
                  </Badge>
                </div>
              </div>

              <div className="py-6 text-center border border-dashed rounded-lg border-border/80 text-muted-foreground text-xs space-y-2">
                <FileText className="h-10 w-10 mx-auto text-primary/60" />
                <p className="font-medium text-foreground">Secure Vault Preview</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Encrypted borrower document stored in LoanFlow Hub local storage.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewDoc(null)}
                  className="text-xs cursor-pointer"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleSimulateDownload(previewDoc);
                    setPreviewDoc(null);
                  }}
                  className="text-xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download File
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
