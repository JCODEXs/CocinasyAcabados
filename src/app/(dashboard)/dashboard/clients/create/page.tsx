// src/app/(dashboard)/clients/components/CreateClientModal.tsx
"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateClientModal({ isOpen, onClose }: CreateClientModalProps) {
  const utils = api.useUtils();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const createClient = api.clients.create.useMutation({
    onSuccess: async() => {
    await  utils.clients.list.invalidate();
      onClose();
      setFormData({ name: "", email: "", phone: "", address: "" });
      setErrors({});
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    createClient.mutate(formData);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Add a new client to your database. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Name Field */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className={errors.name ? "border-red-500" : ""}
                disabled={createClient.isPending}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>
            
            {/* Email Field */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="client@example.com"
                className={errors.email ? "border-red-500" : ""}
                disabled={createClient.isPending}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
            
            {/* Phone Field */}
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                disabled={createClient.isPending}
              />
            </div>
            
            {/* Address Field */}
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main St, City, State 12345"
                rows={3}
                disabled={createClient.isPending}
              />
            </div>
            
            {/* Submit Error */}
            {errors.submit && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createClient.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                "Create Client"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}