"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CollectionSelector } from "@/components/documents/collection-selector";
import { DocumentUploadZone } from "@/components/documents/document-upload-zone";
import { DocumentsTable } from "@/components/documents/documents-table";
import type { Collection } from "@/types/api";

export default function DocumentsPage() {
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("documents.title")}</h1>
          <p className="text-muted-foreground">
            {t("documents.description")}
          </p>
        </div>
      </div>

      {/* Collection Selector */}
      <Card>
        <CardHeader>
          <CardTitle>{t("documents.collection")}</CardTitle>
          <CardDescription>
            {t("documents.collectionDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <CollectionSelector
              selectedId={selectedCollection?.id ?? null}
              onSelect={setSelectedCollection}
            />
          </div>
          {selectedCollection && (
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedCollection.description || t("documents.documentsCount", { count: selectedCollection.document_count })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>{t("documents.uploadDocuments")}</CardTitle>
          <CardDescription>
            {t("documents.uploadDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploadZone
            collectionId={selectedCollection?.id ?? null}
          />
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("documents.title")}</CardTitle>
          <CardDescription>
            {t("documents.documentsInCollection")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsTable collectionId={selectedCollection?.id ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
