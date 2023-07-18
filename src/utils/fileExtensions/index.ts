import web_related_frameworks from "./web_related_frameworks.json" assert { type: "json" };
import programming_languages from "./programming_languages.json" assert { type: "json" };
import markup_languages from "./markup_languages.json" assert { type: "json" };


export const langsMap = new Map(
  Object.entries(
    {
      ...web_related_frameworks,
      ...programming_languages
    }
  ) as [keyof typeof web_related_frameworks| keyof typeof programming_languages, string[]][]
);

export const markupMap= new Map(
  Object.entries(markup_languages) as [keyof typeof markup_languages, string[]][]
)

