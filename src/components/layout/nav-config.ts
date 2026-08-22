import {
  LayoutDashboard,
  Wallet,
  Tags,
  FileText,
  ShoppingCart,
  Truck,
  Users,
  Building2,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { MODULOS, type ModuloCodigo } from "@/domain/enums";

export interface NavItemConfig {
  href: string;
  label: string;
  icon: LucideIcon;
  modulo?: ModuloCodigo;
}

export interface NavGroupConfig {
  titulo: string;
  items: NavItemConfig[];
}

export const NAV_GROUPS: NavGroupConfig[] = [
  {
    titulo: "General",
    items: [{ href: "/", label: "Panel", icon: LayoutDashboard }],
  },
  {
    titulo: "Compras",
    items: [
      { href: "/compras/requisiciones", label: "Requisiciones", icon: FileText, modulo: MODULOS.COMPRAS_REQUISICIONES },
      { href: "/compras/ordenes", label: "Compras / OC", icon: ShoppingCart, modulo: MODULOS.COMPRAS_COMPRAS },
      { href: "/compras/presupuestos", label: "Presupuestos", icon: Wallet, modulo: MODULOS.COMPRAS_PRESUPUESTOS },
      { href: "/compras/proveedores", label: "Proveedores", icon: Truck, modulo: MODULOS.COMPRAS_PROVEEDORES },
      { href: "/compras/rubros", label: "Rubros", icon: Tags, modulo: MODULOS.COMPRAS_RUBROS },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { href: "/administracion/usuarios", label: "Usuarios", icon: Users, modulo: MODULOS.ADMIN_USUARIOS },
      { href: "/administracion/areas", label: "Áreas", icon: Building2, modulo: MODULOS.ADMIN_AREAS },
      { href: "/administracion/ciudades", label: "Ciudades de operación", icon: MapPin, modulo: MODULOS.ADMIN_CIUDADES },
    ],
  },
];
