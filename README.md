# node-gir-typedef
TypeScript .d.ts generator for the GObject Introspection Repository, to use with [`node-gir`](https://github.com/Place1/node-gir).

## The project

This script aims at elevating developper experience by allowing the TypeScript analyzer to get definitions for the GObject Introspection Repository.
 This in turns offer IntelliSense (code completion and documentation features) to Visual Studio Code, and to other editors that support the TypeScript Language Server (or similar methods to provide code completion).
 
## Why can't I just `@types/gir` ?
 
The GIR differ from people to people depending on which packages you have installed. Most people will have the base GIR files (GTK, GLib, Gio, etc.), but the repository is scalable and can be extended with other features (Ubuntu's Unity desktop had GIR files to extend on features of Unity, for example). Therefore, a single, centralized place to put the type definitions will not be of any use, to anybody.