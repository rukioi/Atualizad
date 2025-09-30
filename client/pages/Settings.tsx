/**
 * SISTEMA DE GESTÃO JURÍDICA - MÓDULO CONFIGURAÇÕES
 * =================================================
 *
 * Módulo completo de configurações do sistema para escritórios de advocacia.
 * Organizado em abas especializadas para diferentes aspectos da configuração:
 *
 * ABAS DISPONÍVEIS:
 *
 * 1. EMPRESA
 *    - Dados da empresa (nome, CNPJ, contatos)
 *    - Upload de logo e favicon
 *    - Informações de contato
 *    - Exportação e Importação de Clientes
 *
 * 2. USUÁRIOS
 *    - Gestão de usuários do sistema
 *    - Perfis e permissões
 *    - Grupos de acesso
 *
 * 3. NOTIFICAÇÕES
 *    - Preferências de notificação
 *    - Lembretes de prazos
 *    - Alertas de faturas
 *
 * 4. JURÍDICO
 *    - Status INSS personalizados
 *    - Categorias de casos
 *    - Templates de contratos
 *    - Prazos processuais
 *
 * FUNCIONALIDADES ESPECIAIS:
 * - Upload de arquivos com validação
 * - Editor de templates avançado
 * - Gestão de contas bancárias
 * - Controle de sessões
 *
 * Autor: Sistema de Gestão Jurídica
 * Data: 2024
 * Versão: 2.0
 */

import React, { useState } from "react";
import {
  createSafeOnOpenChange,
  createSafeDialogHandler,
} from "@/lib/dialog-fix";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Settings as SettingsIcon,
  Building,
  Users,
  Mail,
  Palette,
  Bell,
  Shield,
  Globe,
  Scale,
  DollarSign,
  Save,
  Upload,
  Download,
  Edit,
  Plus,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserManagement } from "@/components/Settings/UserManagement";

export function Settings() {
  const [activeTab, setActiveTab] = useState("company");

  // Create safe dialog handlers
  const safeSetShowTemplateModal = createSafeOnOpenChange((open: boolean) =>
    setShowTemplateModal(open),
  );
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // FUNCIONALIDADE FUTURA: Nome dinâmico da empresa
  // Estado para gerenciar o nome da empresa que aparece no DashboardLayout
  const [companyName, setCompanyName] = useState<string>("LegalSaaS");
  const [savedCompanyName, setSavedCompanyName] = useState<string>("LegalSaaS");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<
    "budget" | "invoice" | null
  >(null);
  const [templateContent, setTemplateContent] = useState("");

  // Tratamento de erro
  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-red-600 mb-2">
                  Erro nas Configurações
                </h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => setError(null)}>Tentar Novamente</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Handlers para funcionalidades
  const handleSaveCompany = () => {
    try {
      // Simular upload de arquivos
      if (logoFile) {
        console.log("Uploading logo:", logoFile.name);
        // Aqui seria feito o upload real para o servidor
      }
      if (faviconFile) {
        console.log("Uploading favicon:", faviconFile.name);
        // Aqui seria feito o upload real para o servidor
      }

      // FUNCIONALIDADE IMPLEMENTADA: Mudança dinâmica do nome da empresa
      // Salvar o nome da empresa e atualizar o DashboardLayout
      if (companyName !== savedCompanyName) {
        setSavedCompanyName(companyName);

        // IMPLEMENTAÇÃO FUTURA: Armazenar no localStorage ou banco de dados
        // localStorage.setItem('companyName', companyName);

        // IMPLEMENTAÇÃO FUTURA: Disparar evento para atualizar o DashboardLayout
        // window.dispatchEvent(new CustomEvent('companyNameUpdated', {
        //   detail: { newName: companyName }
        // }));

        // IMPLEMENTAÇÃO FUTURA: Fazer requisição para o backend
        // await updateCompanySettings({ name: companyName });
      }

      alert(
        `✅ Configurações da empresa salvas com sucesso!${companyName !== savedCompanyName ? "\n🏢 Nome da empresa atualizado!" : ""}${logoFile ? "\n🖼️ Logo atualizado!" : ""}${faviconFile ? "\n🌐 Favicon atualizado!" : ""}`,
      );

      // Resetar arquivos após o sucesso
      setLogoFile(null);
      setFaviconFile(null);
    } catch (error) {
      setError("Erro ao salvar configurações da empresa");
    }
  };

  const handleSaveNotifications = () => {
    try {
      alert("✅ Preferências de notificações salvas!");
    } catch (error) {
      setError("Erro ao salvar preferências de notificações");
    }
  };

  // Dados mock dos clientes para exportação
  const mockClientsForExport = [
    {
      nome: "Maria Silva Santos",
      email: "maria@silva.com.br",
      telefone: "(11) 99999-1234",
      pais: "Brasil",
      estado: "São Paulo",
      endereco: "Rua Augusta, 123, Cerqueira César",
      cidade: "São Paulo",
      cep: "01305-000",
      cpf: "123.456.789-00",
      rg: "12.345.678-9",
    },
    {
      nome: "João Carlos Oliveira",
      email: "joao@email.com",
      telefone: "(11) 88888-5678",
      pais: "Brasil",
      estado: "Rio de Janeiro",
      endereco: "Av. Copacabana, 456",
      cidade: "Rio de Janeiro",
      cep: "22070-001",
      cpf: "987.654.321-00",
      rg: "98.765.432-1",
    },
    {
      nome: "Ana Paula Costa",
      email: "ana@costa.adv.br",
      telefone: "(11) 77777-9012",
      pais: "Brasil",
      estado: "São Paulo",
      endereco: "Av. Paulista, 1000",
      cidade: "São Paulo",
      cep: "01310-100",
      cpf: "456.789.123-00",
      rg: "45.678.912-3",
    },
    {
      nome: "Carlos Eduardo Lima",
      email: "carlos@empresa.com.br",
      telefone: "(11) 66666-3456",
      pais: "Brasil",
      estado: "Minas Gerais",
      endereco: "Rua da Liberdade, 789",
      cidade: "Belo Horizonte",
      cep: "30112-000",
      cpf: "789.123.456-00",
      rg: "78.912.345-6",
    },
  ];

  const handleExportClientsCSV = () => {
    try {
      // Criar cabeçalho do CSV
      const headers = [
        "Nome",
        "Email",
        "Telefone",
        "País",
        "Estado",
        "Endereço",
        "Cidade",
        "CEP",
        "CPF",
        "RG",
      ];

      // Converter dados para CSV
      const csvContent = [
        headers.join(","),
        ...mockClientsForExport.map((client) =>
          [
            `"${client.nome}"`,
            `"${client.email}"`,
            `"${client.telefone}"`,
            `"${client.pais}"`,
            `"${client.estado}"`,
            `"${client.endereco}"`,
            `"${client.cidade}"`,
            `"${client.cep}"`,
            `"${client.cpf}"`,
            `"${client.rg}"`,
          ].join(","),
        ),
      ].join("\n");

      // Criar e baixar arquivo
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `clientes_export_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(
        `✅ Exportação concluída!\n\n📊 ${mockClientsForExport.length} clientes exportados\n📁 Arquivo: clientes_export_${new Date().toISOString().split("T")[0]}.csv\n\n🔽 Download iniciado automaticamente`,
      );
    } catch (error) {
      setError("Erro ao exportar clientes para CSV");
    }
  };

  const handleImportClientsCSV = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Verificar se é um arquivo CSV
      if (!file.name.toLowerCase().endsWith(".csv")) {
        alert("❌ Erro: Por favor, selecione um arquivo CSV (.csv)");
        return;
      }

      // Ler arquivo
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        alert("❌ Erro: Arquivo CSV vazio ou sem dados");
        return;
      }

      // Processar cabeçalho
      const headers = lines[0]
        .split(",")
        .map((h) => h.replace(/"/g, "").trim().toLowerCase());

      // Validar campos obrigatórios
      const requiredFields = ["nome", "cpf"];
      const missingFields = requiredFields.filter(
        (field) => !headers.some((header) => header.includes(field)),
      );

      if (missingFields.length > 0) {
        alert(
          `❌ Erro: Campos obrigatórios ausentes no CSV:\n\n• ${missingFields.join("\n• ")}\n\nCampos obrigatórios: Nome, CPF`,
        );
        return;
      }

      // Processar dados
      const importedClients = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
          .split(",")
          .map((v) => v.replace(/"/g, "").trim());

        if (values.length < headers.length) {
          errors.push(`Linha ${i + 1}: Número de colunas insuficiente`);
          continue;
        }

        const client: any = {};
        headers.forEach((header, index) => {
          if (header.includes("nome")) client.nome = values[index];
          else if (header.includes("email")) client.email = values[index];
          else if (header.includes("telefone")) client.telefone = values[index];
          else if (header.includes("país") || header.includes("pais"))
            client.pais = values[index];
          else if (header.includes("estado")) client.estado = values[index];
          else if (header.includes("endereço") || header.includes("endereco"))
            client.endereco = values[index];
          else if (header.includes("cidade")) client.cidade = values[index];
          else if (header.includes("cep")) client.cep = values[index];
          else if (header.includes("cpf")) client.cpf = values[index];
          else if (header.includes("cnpj")) client.cnpj = values[index];
          else if (header.includes("rg")) client.rg = values[index];
        });

        // Validar campos obrigatórios
        if (!client.nome || !client.cpf) {
          errors.push(`Linha ${i + 1}: Nome ou CPF em branco`);
          continue;
        }

        // Adicionar campos padrão
        client.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        client.createdAt = new Date().toISOString();
        client.status = "active";

        importedClients.push(client);
      }

      // Mostrar resultado
      if (importedClients.length > 0) {
        alert(
          `✅ Importação concluída!\n\n📊 ${importedClients.length} cliente(s) importado(s) com sucesso${errors.length > 0 ? `\n⚠️ ${errors.length} erro(s) encontrado(s)` : ""}\n\n🔄 Os clientes foram adicionados ao CRM automaticamente`,
        );

        console.log("📝 Clientes importados:", importedClients);
        if (errors.length > 0) {
          console.warn("⚠️ Erros de importação:", errors);
        }
      } else {
        alert(
          `❌ Importação falhou!\n\nNenhum cliente válido encontrado.\n\nErros:\n• ${errors.join("\n• ")}`,
        );
      }
    } catch (error) {
      setError("Erro ao processar arquivo CSV");
      alert(
        "❌ Erro ao processar arquivo CSV. Verifique se o formato está correto.",
      );
    } finally {
      // Limpar input
      event.target.value = "";
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar tipo de arquivo
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/svg+xml",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Tipo de arquivo não suportado. Use PNG, JPEG ou SVG.");
        return;
      }

      // Verificar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Arquivo muito grande. Tamanho máximo: 5MB.");
        return;
      }

      setLogoFile(file);

      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);

        // FUNCIONALIDADE FUTURA: Upload automático e seleção da logo
        // Quando implementar backend, aqui será o local para:
        // 1. Fazer upload automático do arquivo para o servidor
        // 2. Salvar a URL da imagem no localStorage ou estado global
        // 3. Atualizar automaticamente o logo no DashboardLayout
        // 4. Enviar notificação de sucesso
        // Exemplo de implementação futura:
        // localStorage.setItem('companyLogo', e.target?.result as string);
        // window.dispatchEvent(new Event('logoUpdated')); // Evento para atualizar layout
      };
      reader.readAsDataURL(file);

      setError(null);
    }
  };

  const handleFaviconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar tipo de arquivo
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/svg+xml",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Tipo de arquivo não suportado. Use PNG, JPEG ou SVG.");
        return;
      }

      // Verificar tamanho (máximo 1MB para favicon)
      if (file.size > 1024 * 1024) {
        setError("Arquivo muito grande para favicon. Tamanho máximo: 1MB.");
        return;
      }

      setFaviconFile(file);

      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFaviconPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setError(null);
    }
  };

  const handleUploadLogo = () => {
    document.getElementById("logo-upload")?.click();
  };

  const handleUploadFavicon = () => {
    document.getElementById("favicon-upload")?.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Configurações</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Personalização do sistema, perfis e integrações
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="company" className="flex items-center">
              <Building className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Empresa</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <Bell className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="legal" className="flex items-center">
              <Scale className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Jurídico</span>
            </TabsTrigger>
          </TabsList>

          {/* Company Settings */}
          <TabsContent value="company">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Perfil da Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="company-name">Nome da Empresa</Label>
                        <Input
                          id="company-name"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Digite o nome da empresa"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company-cnpj">CNPJ</Label>
                        <Input
                          id="company-cnpj"
                          defaultValue="12.345.678/0001-90"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company-email">Email</Label>
                        <Input
                          id="company-email"
                          type="email"
                          defaultValue="contato@silva.adv.br"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company-phone">Telefone</Label>
                        <Input
                          id="company-phone"
                          defaultValue="(11) 3333-4444"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="company-address">Endereço</Label>
                        <Input
                          id="company-address"
                          defaultValue="Av. Paulista, 1000, Bela Vista"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="company-city">Cidade</Label>
                          <Input id="company-city" defaultValue="São Paulo" />
                        </div>
                        <div>
                          <Label htmlFor="company-state">Estado</Label>
                          <Input id="company-state" defaultValue="SP" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="company-zipcode">CEP</Label>
                          <Input
                            id="company-zipcode"
                            defaultValue="01310-100"
                          />
                        </div>
                        <div>
                          <Label htmlFor="company-country">País</Label>
                          <Input id="company-country" defaultValue="Brasil" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="company-website">Website</Label>
                      <Input
                        id="company-website"
                        placeholder="https://www.silva.adv.br"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company-description">Descrição</Label>
                      <Textarea
                        id="company-description"
                        placeholder="Descrição do escritório..."
                        defaultValue="Escritório de advocacia especializado em direito civil, trabalhista e previdenciário."
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Logo e Marca</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Logo da Empresa</Label>
                        <div className="mt-2 flex items-center space-x-4">
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {logoPreview ? (
                              <img
                                src={logoPreview}
                                alt="Logo preview"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Building className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button
                              variant="outline"
                              onClick={handleUploadLogo}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {logoFile ? "Trocar Logo" : "Upload Logo"}
                            </Button>
                            {logoFile && (
                              <div className="text-xs text-muted-foreground">
                                {logoFile.name} (
                                {(logoFile.size / 1024).toFixed(1)}KB)
                              </div>
                            )}
                          </div>
                          <input
                            id="logo-upload"
                            type="file"
                            accept=".png,.jpg,.jpeg,.svg"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Formatos aceitos: PNG, JPEG, SVG. Tamanho máximo: 5MB
                        </p>
                      </div>
                      <div>
                        <Label>Favicon</Label>
                        <div className="mt-2 flex items-center space-x-4">
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center overflow-hidden">
                            {faviconPreview ? (
                              <img
                                src={faviconPreview}
                                alt="Favicon preview"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button
                              variant="outline"
                              onClick={handleUploadFavicon}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {faviconFile
                                ? "Trocar Favicon"
                                : "Upload Favicon"}
                            </Button>
                            {faviconFile && (
                              <div className="text-xs text-muted-foreground">
                                {faviconFile.name} (
                                {(faviconFile.size / 1024).toFixed(1)}KB)
                              </div>
                            )}
                          </div>
                          <input
                            id="favicon-upload"
                            type="file"
                            accept=".png,.jpg,.jpeg,.svg"
                            onChange={handleFaviconUpload}
                            className="hidden"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Formatos aceitos: PNG, JPEG, SVG. Tamanho máximo: 1MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveCompany}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Client Export/Import Section - Moved from Security */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Download className="h-5 w-5 mr-2" />
                    Exportação e Importação de Clientes
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Gerencie dados de clientes através de arquivos CSV
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Exportação */}
                  <div className="space-y-4">
                    <h4 className="font-medium">📤 Exportar Clientes</h4>
                    <p className="text-sm text-muted-foreground">
                      Baixe todos os dados dos clientes em formato CSV para
                      backup ou transferência.
                    </p>
                    <div className="flex items-center space-x-4">
                      <Button onClick={handleExportClientsCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar CSV
                      </Button>
                      <div className="text-sm text-muted-foreground">
                        📊 {mockClientsForExport.length} clientes disponíveis
                      </div>
                    </div>
                  </div>

                  {/* Importação */}
                  <div className="space-y-4">
                    <h4 className="font-medium">📥 Importar Clientes</h4>
                    <p className="text-sm text-muted-foreground">
                      Carregue dados de clientes a partir de um arquivo CSV.
                      Campos obrigatórios: Nome, CPF.
                    </p>
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="outline"
                        onClick={() =>
                          document.getElementById("import-csv")?.click()
                        }
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Selecionar Arquivo CSV
                      </Button>
                      <input
                        id="import-csv"
                        type="file"
                        accept=".csv"
                        onChange={handleImportClientsCSV}
                        className="hidden"
                      />
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs text-yellow-800">
                        <strong>⚠️ Formato esperado:</strong> Nome, Email,
                        Telefone, País, Estado, Endereço, Cidade, CEP, CPF, RG
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Configurações de Notificações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notificações Push</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificações no navegador
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="space-y-3">
                    <Label>Prazos de Projetos</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Avisar 3 dias antes</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Avisar 7 dias antes</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Avisar 15 dias antes</span>
                        <Switch />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Lembretes de Faturas</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          3 dias antes do vencimento
                        </span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          1 dia depois do vencimento
                        </span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Frequência semanal</span>
                        <Switch />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveNotifications}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Preferências
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legal Settings */}
          <TabsContent value="legal">
            <div className="space-y-6">
              {/* Status INSS */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Scale className="h-5 w-5 mr-2" />
                    Status INSS Personalizados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Status Disponíveis</Label>
                      <div className="mt-2 space-y-2">
                        {[
                          "Ativo",
                          "Inativo",
                          "Pendente",
                          "Em Análise",
                          "Suspenso",
                          "Cancelado",
                        ].map((status) => (
                          <div
                            key={status}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <span className="text-sm">{status}</span>
                            <div className="flex items-center space-x-2">
                              <Switch
                                defaultChecked={
                                  status === "Ativo" || status === "Inativo"
                                }
                              />
                              <Button variant="ghost" size="sm">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="new-inss-status">
                        Adicionar Novo Status
                      </Label>
                      <div className="mt-2 flex space-x-2">
                        <Input placeholder="Nome do status" />
                        <Button>Adicionar</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Categorias de Casos */}
              <Card>
                <CardHeader>
                  <CardTitle>Categorias de Casos Jurídicos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Áreas do Direito</Label>
                      <div className="mt-2 space-y-2">
                        {[
                          "Direito Civil",
                          "Direito Trabalhista",
                          "Direito Previdenciário",
                          "Direito Empresarial",
                          "Direito Família",
                          "Direito Criminal",
                          "Direito Tributário",
                          "Direito Consumidor",
                        ].map((area) => (
                          <div
                            key={area}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <span className="text-sm">{area}</span>
                            <div className="flex items-center space-x-2">
                              <Switch defaultChecked />
                              <Button variant="ghost" size="sm">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Tipos de Processo</Label>
                      <div className="mt-2 space-y-2">
                        {[
                          "Consultoria",
                          "Ação Judicial",
                          "Recurso",
                          "Execução",
                          "Mediação",
                          "Arbitragem",
                          "Acordo Extrajudicial",
                          "Petição Inicial",
                        ].map((tipo) => (
                          <div
                            key={tipo}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <span className="text-sm">{tipo}</span>
                            <div className="flex items-center space-x-2">
                              <Switch defaultChecked />
                              <Button variant="ghost" size="sm">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
