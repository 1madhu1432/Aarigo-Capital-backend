import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { fmtDate } from "@/lib/format";
import type { DocumentCategory, DocumentFile, DocumentVerificationStatus } from "@/types";

const CATEGORIES: { label: string; value: DocumentCategory; types: string[] }[] = [
  {
    label: "IDENTITY / KYC",
    value: "IDENTITY_KYC",
    types: ["Aadhaar Card", "PAN Card", "Voter ID", "Driving Licence", "Passport", "Other Government ID"],
  },
  {
    label: "ADDRESS PROOF",
    value: "ADDRESS_PROOF",
    types: ["Aadhaar", "Electricity Bill", "Water Bill", "Gas Bill", "Bank Statement", "Rental Agreement", "Property / House Tax Receipt", "Other Address Proof"],
  },
  {
    label: "INCOME / FINANCIAL",
    value: "INCOME_FINANCIAL",
    types: ["Salary Slip", "Bank Statement", "Income Tax Return", "Business Proof", "GST Certificate", "Other Income Proof"],
  },
  {
    label: "LOAN DOCUMENTS",
    value: "LOAN_DOCUMENTS",
    types: ["Loan Application", "Loan Agreement", "Promissory Note", "Sanction Letter", "Disbursement Proof", "EMI Schedule", "Guarantor Agreement", "Other Loan Document"],
  },
  {
    label: "CUSTOMER / PERSONAL",
    value: "CUSTOMER_PERSONAL",
    types: ["Customer Photo", "Signature", "Nominee Document", "Guarantor Photo", "Guarantor ID Proof", "Guarantor Address Proof"],
  },
  {
    label: "COLLATERAL / SECURITY",
    value: "COLLATERAL_SECURITY",
    types: ["Property Documents", "Vehicle Documents", "RC", "Insurance", "Gold / Security Documents", "Other Security Documents"],
  },
  {
    label: "OTHER",
    value: "OTHER",
    types: ["Other Document"],
  },
];

interface DocumentManagerProps {
  customerId: string;
  loanId?: string;
}

export function DocumentManager({ customerId, loanId }: DocumentManagerProps) {
  const { documents, addDocumentFull, updateDocumentStatus, deleteDocument } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("IDENTITY_KYC");
  const [selectedType, setSelectedType] = useState<string>("Aadhaar Card");
  const [docName, setDocName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const customerDocs = useMemo(() => {
    return documents.filter((d) => d.customerId === customerId && (!loanId || d.loanId === loanId || !d.loanId));
  }, [documents, customerId, loanId]);

  const filteredDocs = useMemo(() => {
    if (filterCategory === "ALL") return customerDocs;
    return customerDocs.filter((d) => d.category === filterCategory);
  }, [customerDocs, filterCategory]);

  const currentTypes = useMemo(() => {
    return CATEGORIES.find((c) => c.value === selectedCategory)?.types ?? ["Other Document"];
  }, [selectedCategory]);

  const handleCategoryChange = (val: DocumentCategory) => {
    setSelectedCategory(val);
    const cat = CATEGORIES.find((c) => c.value === val);
    if (cat && cat.types[0]) {
      setSelectedType(cat.types[0]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target?.result as string;
      const sizeKb = Math.round(file.size / 1024);

      addDocumentFull({
        customerId,
        loanId,
        category: selectedCategory,
        type: selectedType,
        name: docName.trim() || `${selectedType} - ${file.name}`,
        fileName: file.name,
        sizeKb,
        documentNumber: docNumber.trim() || undefined,
        expiryDate: expiryDate || undefined,
        verificationStatus: "Pending",
        fileData,
      });

      toast.success(`${selectedType} uploaded successfully!`);
      setDocName("");
      setDocNumber("");
      setExpiryDate("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = (doc: DocumentFile, status: DocumentVerificationStatus) => {
    updateDocumentStatus(doc.id, status, actionNotes.trim() || undefined);
    toast.success(`Document marked as ${status}`);
    setActionNotes("");
    if (previewDoc?.id === doc.id) {
      setPreviewDoc((prev) => (prev ? { ...prev, verificationStatus: status } : null));
    }
  };

  const handleDownload = (doc: DocumentFile) => {
    if (doc.fileData) {
      const a = document.createElement("a");
      a.href = doc.fileData;
      a.download = doc.fileName;
      a.click();
    } else {
      toast.info(`Simulated download for ${doc.fileName}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <Card className="border border-border/80 bg-card">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-bold">Document Vault & Verification</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => setIsUploading(!isUploading)}
            className="h-8 text-xs cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Upload Document
          </Button>
        </CardHeader>

        {/* Upload Form Modal/Section */}
        {isUploading && (
          <CardContent className="p-4 border-t border-border/60 bg-muted/20 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">New Document Entry</span>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setIsUploading(false)}>
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Category</Label>
                <Select value={selectedCategory} onValueChange={(v) => handleCategoryChange(v as DocumentCategory)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Document Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentTypes.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Document Label / Title</Label>
                <Input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Front & Back Aadhaar"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Doc / ID Number (Optional)</Label>
                <Input
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="e.g. 1234 5678 9012"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer w-full"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Select File & Save
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button
          size="sm"
          variant={filterCategory === "ALL" ? "default" : "outline"}
          onClick={() => setFilterCategory("ALL")}
          className="h-7 text-xs rounded-full cursor-pointer shrink-0"
        >
          All ({customerDocs.length})
        </Button>
        {CATEGORIES.map((cat) => {
          const count = customerDocs.filter((d) => d.category === cat.value).length;
          return (
            <Button
              key={cat.value}
              size="sm"
              variant={filterCategory === cat.value ? "default" : "outline"}
              onClick={() => setFilterCategory(cat.value)}
              className="h-7 text-xs rounded-full cursor-pointer shrink-0"
            >
              {cat.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Documents List Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-8 text-center space-y-2 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto opacity-40" />
            <p className="text-xs">No documents uploaded for this category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Category / Type</th>
                  <th className="p-3">Document Name</th>
                  <th className="p-3">Doc Number</th>
                  <th className="p-3">Uploaded</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-bold text-foreground">{doc.type}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{doc.category.replace("_", " ")}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-foreground">{doc.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{doc.fileName} ({doc.sizeKb} KB)</p>
                    </td>
                    <td className="p-3 font-mono text-xs text-foreground">
                      {doc.documentNumber || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {fmtDate(doc.uploadedAt)}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] gap-1 ${
                          doc.verificationStatus === "Verified"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                            : doc.verificationStatus === "Rejected"
                            ? "bg-rose-500/10 text-rose-700 border-rose-500/30"
                            : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                        }`}
                      >
                        {doc.verificationStatus === "Verified" && <CheckCircle2 className="h-3 w-3" />}
                        {doc.verificationStatus === "Rejected" && <XCircle className="h-3 w-3" />}
                        {doc.verificationStatus === "Pending" && <Clock className="h-3 w-3" />}
                        {doc.verificationStatus}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => setPreviewDoc(doc)}
                          title="Preview"
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => handleDownload(doc)}
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={() => {
                            deleteDocument(doc.id);
                            toast.success("Document deleted");
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview & Verification Dialog */}
      {previewDoc && (
        <Dialog open={Boolean(previewDoc)} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between">
                <span>{previewDoc.type}</span>
                <Badge
                  variant="outline"
                  className={
                    previewDoc.verificationStatus === "Verified"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : previewDoc.verificationStatus === "Rejected"
                      ? "bg-rose-500/10 text-rose-700"
                      : "bg-amber-500/10 text-amber-700"
                  }
                >
                  {previewDoc.verificationStatus}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Category: {previewDoc.category} • File: {previewDoc.fileName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {/* Preview Window */}
              <div className="w-full h-64 rounded-xl border border-border bg-black/5 flex items-center justify-center overflow-hidden">
                {previewDoc.fileData?.startsWith("data:image/") ? (
                  <img src={previewDoc.fileData} alt={previewDoc.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center space-y-2">
                    <FileText className="h-12 w-12 mx-auto text-primary opacity-60" />
                    <p className="font-semibold text-xs">{previewDoc.name}</p>
                    <p className="text-[10px] text-muted-foreground">{previewDoc.fileName} ({previewDoc.sizeKb} KB)</p>
                  </div>
                )}
              </div>

              {/* Doc Metadata */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/40 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Document ID</span>
                  <span className="font-mono font-semibold">{previewDoc.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Uploaded Date</span>
                  <span className="font-semibold">{fmtDate(previewDoc.uploadedAt)}</span>
                </div>
                {previewDoc.documentNumber && (
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Doc Number</span>
                    <span className="font-mono font-semibold">{previewDoc.documentNumber}</span>
                  </div>
                )}
                {previewDoc.expiryDate && (
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Expiry Date</span>
                    <span className="font-semibold">{fmtDate(previewDoc.expiryDate)}</span>
                  </div>
                )}
              </div>

              {/* Verification Controls */}
              <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                <span className="font-bold text-xs block">Update Verification Status</span>
                <Input
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Verification notes (e.g. Aadhaar verified against Govt Portal)"
                  className="h-8 text-xs"
                />
                <div className="flex gap-2 justify-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-rose-500/40 text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                    onClick={() => handleVerify(previewDoc, "Rejected")}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject Document
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    onClick={() => handleVerify(previewDoc, "Verified")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Mark Verified
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
