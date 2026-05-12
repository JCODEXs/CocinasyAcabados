// src/app/(dashboard)/clients/page.tsx
"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import { CreateClientModal } from "../../../_components/create/CreateClientModal";

export default function ClientsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: clients, isLoading } = api.clients.list.useQuery();
  
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="mt-2 text-gray-600">Manage your client relationships</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Client
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clients?.map((client) => (
          <Card key={client.id}>
            <CardHeader>
              <CardTitle>{client.name}</CardTitle>
              {client.email && (
                <CardDescription>{client.email}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {client.phone && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Phone:</span> {client.phone}
                </p>
              )}
              {client.address && (
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Address:</span> {client.address}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        
        {clients?.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">No clients yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsModalOpen(true)}
            >
              Create your first client
            </Button>
          </div>
        )}
      </div>
      
      <CreateClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}