"use client";

import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  Link,
} from "@mui/material";
import clsx from "clsx";
import Image from "next/image";
import MenuIcon from "@mui/icons-material/Menu";
import { useState } from "react";

import { siteConfig } from "@/config/site";

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <AppBar
      className="bg-panels-background text-white"
      elevation={0}
      position="sticky"
    >
      <Toolbar
        className="bg-menuBar-background shadow-md border-b border-b-panels-border text-white"
        variant="dense"
      >
        <Box
          sx={{
            flex: "2 1 auto",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            component="li"
            sx={{ display: "flex", alignItems: "center", gap: 3 }}
          >
            <Link
              className="flex text-white justify-start items-center gap-5"
              href="/"
              underline="none"
            >
              <Image
                alt="Logo"
                className="w-12 h-8 object-contain"
                height={24}
                src="/mindmapflow_icon_white.svg"
                width={24}
              />
              <Box width={12} />
              <p className="font-bold text-inherit">MindMapFlow</p>
            </Link>
          </Box>

          <Box className="hidden sm:flex gap-2" component="ul">
            {siteConfig.navItems.map((item) => (
              <ListItem key={item.href} className="w-auto p-0">
                <Link
                  className={clsx(
                    "data-[active=true]:text-primary data-[active=true]:font-medium text-white",
                  )}
                  href={item.href}
                  underline="none"
                >
                  {item.label}
                </Link>
              </ListItem>
            ))}
          </Box>

          <Button
            className="bg-toolBar-background text-white"
            component={Link}
            href={siteConfig.internalLinks.editor}
            size="small"
            sx={{ display: { xs: "none", sm: "flex" } }}
            variant="contained"
          >
            Try early version 😊
          </Button>
        </Box>

        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            gap: 2,
          }}
        />

        <Box>
          <IconButton
            aria-label="open drawer"
            className="sm:invisible"
            color="inherit"
            edge="end"
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        <Drawer
          anchor="right"
          open={mobileOpen}
          variant="temporary"
          onClose={handleDrawerToggle}
        >
          <List className="p-2">
            {siteConfig.navMenuItems.map((item, index) => (
              <ListItem key={`${item}-${index}`} className="p-4">
                {item.label === "Editor" ? (
                  <Button
                    className="bg-toolBar-background text-white"
                    component={Link}
                    href={siteConfig.internalLinks.editor}
                    size="large"
                    variant="contained"
                  >
                    Try early version 😊
                  </Button>
                ) : (
                  <Link
                    className={clsx(
                      "data-[active=true]:text-primary data-[active=true]:font-medium text-black",
                    )}
                    href={item.href}
                    underline="none"
                  >
                    {item.label}
                  </Link>
                )}
              </ListItem>
            ))}
          </List>
        </Drawer>
      </Toolbar>
    </AppBar>
  );
};
