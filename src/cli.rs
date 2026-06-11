use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "deepdeps")]
#[command(about = "See what you're really installing", long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    #[command(about = "Analyze dependencies in a project")]
    Analyze {
        #[arg(help = "Path to manifest file or project directory")]
        path: Option<String>,

        #[arg(short, long, help = "Project name")]
        name: Option<String>,

        #[arg(long, help = "Output format (json, table)")]
        format: Option<String>,
    },

    #[command(about = "Show security vulnerabilities")]
    Security {
        #[arg(help = "Analysis ID or project path")]
        target: Option<String>,
    },

    #[command(about = "Generate a dependency report")]
    Report {
        #[arg(help = "Analysis ID or project path")]
        target: Option<String>,

        #[arg(short, long, help = "Output format (html, json, markdown)")]
        format: Option<String>,

        #[arg(short, long, help = "Output file path")]
        output: Option<String>,
    },

    #[command(about = "Show dependency tree")]
    Tree {
        #[arg(help = "Project path or analysis ID")]
        target: Option<String>,
    },

    #[command(about = "Compare two analyses")]
    Diff {
        #[arg(help = "First analysis ID")]
        id1: String,

        #[arg(help = "Second analysis ID")]
        id2: String,
    },

    #[command(about = "Open the interactive web UI")]
    Ui {
        #[arg(short = 'P', long, default_value = "3030")]
        port: u16,

        #[arg(short = 'p', long, help = "Directory to analyze")]
        path: Option<String>,
    },
}
