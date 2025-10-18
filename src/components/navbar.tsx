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
      className="bg-menuBar-background text-menuBar-text"
      elevation={0}
      position="sticky"
    >
      <Toolbar
        className="bg-menuBar-background shadow-md border-b border-b-menuBar-border text-menuBar-text"
        sx={{
          "& .MuiIconButton-root": {
            color: "var(--color-menuBar-text)",
          },
          "& .MuiIconButton-root:hover": {
            color: "var(--color-link-text)",
          },
        }}
        variant="dense"
      >
        <Box
          sx={{
            flex: "2 1 auto",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box
            component="li"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <Link
              className="flex text-menuBar-text justify-start items-center gap-1"
              href="/"
              underline="none"
            >
              <Image
                alt="Logo"
                className="w-8 h-8 object-contain"
                height={24}
                src="/app_icon.svg"
                width={24}
              />
              <Box width={12} />
              <p className="font-bold text-inherit">MindMapFlow</p>
            </Link>
          </Box>

          <Box className="hidden sm:flex gap-5" component="ul">
            {siteConfig.navItems.map((item) => (
              <ListItem key={item.href} className="w-auto p-0">
                <Link
                  className={clsx(
                    "data-[active=true]:text-primary data-[active=true]:font-medium text-menuBar-text",
                  )}
                  href={item.href}
                  underline="none"
                >
                  {item.label}
                </Link>
              </ListItem>
            ))}
          </Box>
          <Box width={12} />
          <Button
            className="bg-toolBar-background text-toolBar-text"
            component={Link}
            href={siteConfig.internalLinks.editor}
            size="small"
            sx={{
              display: { xs: "none", sm: "flex" },
              backgroundColor: "var(--color-toolBar-background)",
              color: "var(--color-toolBar-text)",
              "&:hover": {
                backgroundColor: "var(--color-toolBar-border)",
                color: "var(--color-toolBar-text)",
              },
            }}
            variant="contained"
          >
            Try it out 😊
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
            sx={{ color: "var(--color-menuBar-text)" }}
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        <Drawer
          PaperProps={{
            sx: {
              backgroundColor: "var(--color-panels-background)",
              color: "var(--color-panels-text)",
            },
          }}
          anchor="right"
          open={mobileOpen}
          variant="temporary"
          onClose={handleDrawerToggle}
        >
          <Box sx={{ width: 320, p: 2 }}>
            <List className="p-0">
              {siteConfig.navMenuItems.map((item, index) => (
                <ListItem key={`${item.href}-${index}`} className="px-0 py-2">
                  {item.label === "Editor" ? (
                    <Button
                      className="bg-toolBar-background text-toolBar-text"
                      component={Link}
                      href={siteConfig.internalLinks.editor}
                      size="large"
                      sx={{
                        backgroundColor: "var(--color-toolBar-background)",
                        color: "var(--color-toolBar-text)",
                        "&:hover": {
                          backgroundColor: "var(--color-toolBar-border)",
                          color: "var(--color-toolBar-text)",
                        },
                      }}
                      variant="contained"
                      onClick={handleDrawerToggle}
                    >
                      Try it out 😊
                    </Button>
                  ) : (
                    <Link
                      className={clsx(
                        "data-[active=true]:text-primary data-[active=true]:font-medium text-panels-text",
                      )}
                      href={item.href}
                      underline="none"
                      onClick={handleDrawerToggle}
                    >
                      {item.label}
                    </Link>
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>
      </Toolbar>
    </AppBar>
  );
};
