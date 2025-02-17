import { lookupWhois } from "@/lib/whois/lookup";
import {
  cn,
  isEnter,
  toReadableISODate,
  toSearchURI,
  useClipboard,
  useSaver,
} from "@/lib/utils";
import { NextPageContext } from "next";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CircleX,
  CopyIcon,
  CornerDownRight,
  DownloadIcon,
  ExternalLink,
  Link2,
  Loader2,
  Search,
  Send,
  Unlink2,
} from "lucide-react";
import React, { useEffect, useMemo } from "react";
import { addHistory } from "@/lib/history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TextArea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDomain } from "tldjs";
import { VERSION } from "@/lib/env";
import { WhoisAnalyzeResult, WhoisResult } from "@/lib/whois/types";
import Icon from "@/components/icon";

type Props = {
  data: WhoisResult;
  target: string;
};

function cleanDomain(domain: string): string {
  const hostname = getDomain(domain);
  if (hostname) {
    return hostname;
  }

  // if contains ip, extract it and return
  const ipMatch = domain.match(
    /^(https?:\/\/)?((\d{1,3}\.){3}\d{1,3})(:\d+)?(\/.*)?$/,
  );
  if (ipMatch) {
    return ipMatch[2];
  }

  return domain;
}

export async function getServerSideProps(context: NextPageContext) {
  const { query } = context;
  const target: string = cleanDomain(
    typeof query.query === "string" ? query.query : "",
  );

  return {
    props: {
      data: await lookupWhois(target),
      target,
    },
  };
}

type ErrorAreaProps = {
  error: string;
};

function ErrorArea({ error }: ErrorAreaProps) {
  const copy = useClipboard();

  return (
    <div
      className={`flex flex-col items-center w-full h-fit mt-2 p-2 border border-red-500 rounded-md text-red-500`}
    >
      <div className={`text-md inline-flex flex-row items-center`}>
        <CircleX className={`w-3.5 h-3.5 mr-1`} />
        Lookup Failed
      </div>
      <div className={`text-sm mt-2 text-center`}>
        <div
          className={`inline-block mr-1 w-3 h-3 cursor-pointer`}
          onClick={() => copy(error)}
        >
          <CopyIcon className={`w-3 h-3`} />
        </div>
        {error}
      </div>
    </div>
  );
}

type ResultTableProps = {
  result?: WhoisAnalyzeResult;
  target: string;
};

function ResultTable({ result, target }: ResultTableProps) {
  const Row = ({
    name,
    value,
    children,
    hidden,
    likeLink,
  }: {
    name: string;
    value: any;
    hidden?: boolean;
    children?: React.ReactNode;
    likeLink?: boolean;
  }) =>
    !hidden && (
      <tr>
        <td
          className={`py-1 pr-2 text-right font-medium text-secondary whitespace-pre-wrap md:w-36`}
        >
          {name}
        </td>
        <td
          className={cn(
            `py-1 pl-2 text-left text-primary whitespace-pre-wrap break-all`,
            likeLink && `cursor-pointer hover:underline`,
          )}
          onClick={() => {
            if (likeLink) {
              window.open(
                value.startsWith("http") ? value : `http://${value}`,
                "_blank",
                "noopener,noreferrer",
              );
            }
          }}
        >
          {value}
          {children}
        </td>
      </tr>
    );

  const StatusComp = () => {
    if (!result || result.status.length === 0) {
      return "N/A";
    }

    const status = useMemo(() => {
      const length = result.status.length;
      if (length > 3 && !expand) {
        return [
          ...result.status.slice(0, 3),
          {
            status: `...${length - 3} more`,
            url: "expand",
          },
        ];
      }

      return result.status;
    }, [result.status]);

    return (
      <div className={`inline-flex flex-row items-center flex-wrap`}>
        {status.map((status, index) => (
          <Link
            href={status.url}
            key={index}
            target={`_blank`}
            className={`inline-flex flex-row items-center m-0.5 cursor-pointer px-1 py-0.5 border rounded text-xs`}
            onClick={(e) => {
              if (status.url === "expand") {
                e.preventDefault();
                setExpand(!expand);
              } else if (!status.url) {
                e.preventDefault();
              }
            }}
          >
            {status.url !== "expand" && (
              <Icon
                icon={status.url ? <Link2 /> : <Unlink2 />}
                className={`w-3 h-3 mr-1`}
              />
            )}
            {status.status}
          </Link>
        ))}
      </div>
    );
  };

  const [expand, setExpand] = React.useState<boolean>(false);
  const copy = useClipboard();

  return (
    result && (
      <table className={`w-full text-sm mb-4 whitespace-pre-wrap`}>
        <tbody>
          <Row name={`Name`} value={result.domain || target.toUpperCase()} />
          <Row name={`Status`} value={<StatusComp />} />
          <Row
            name={`Registrar`}
            value={result.registrar}
            hidden={!result.registrar || result.registrar === "Unknown"}
          />
          <Row
            name={`Registrar URL`}
            value={result.registrarURL}
            likeLink
            hidden={!result.registrarURL || result.registrarURL === "Unknown"}
          />
          <Row
            name={`IANA ID`}
            value={result.ianaId}
            hidden={!result.ianaId || result.ianaId === "N/A"}
          >
            <Link
              className={`inline-flex ml-1`}
              href={`https://www.internic.net/registrars/registrar-${result.ianaId ?? 0}.html`}
              target={`_blank`}
            >
              <Button variant={`ghost`} size={`icon-xs`}>
                <ExternalLink className={`w-3 h-3`} />
              </Button>
            </Link>
          </Row>

          {/* IP Whois Only */}
          <Row
            name={`CIDR`}
            value={result.cidr}
            hidden={!result.cidr || result.cidr === "Unknown"}
          />
          <Row
            name={`Net Type`}
            value={result.netType}
            hidden={!result.netType || result.netType === "Unknown"}
          />
          <Row
            name={`Net Name`}
            value={result.netName}
            hidden={!result.netName || result.netName === "Unknown"}
          />
          <Row
            name={`INet Num`}
            value={result.inetNum}
            hidden={!result.inetNum || result.inetNum === "Unknown"}
          />
          <Row
            name={`INet6 Num`}
            value={result.inet6Num}
            hidden={!result.inet6Num || result.inet6Num === "Unknown"}
          />
          <Row
            name={`Net Range`}
            value={result.netRange}
            hidden={!result.netRange || result.netRange === "Unknown"}
          />
          <Row
            name={`Origin AS`}
            value={result.originAS}
            hidden={!result.originAS || result.originAS === "Unknown"}
          />
          {/* IP Whois Only End */}

          <Row
            name={`Whois Server`}
            value={result.whoisServer}
            likeLink
            hidden={!result.whoisServer || result.whoisServer === "Unknown"}
          />

          <Row
            name={`Creation Date`}
            value={toReadableISODate(result.creationDate)}
            hidden={!result.creationDate || result.creationDate === "Unknown"}
          >
            <div
              className={`inline-flex ml-1 select-none px-1 py-0.5 border rounded-md text-xs`}
            >
              UTC
            </div>
          </Row>
          <Row
            name={`Updated Date`}
            value={toReadableISODate(result.updatedDate)}
            hidden={!result.updatedDate || result.updatedDate === "Unknown"}
          >
            <div
              className={`inline-flex ml-1 select-none px-1 py-0.5 border rounded-md text-xs`}
            >
              UTC
            </div>
          </Row>
          <Row
            name={`Expiration Date`}
            value={toReadableISODate(result.expirationDate)}
            hidden={
              !result.expirationDate || result.expirationDate === "Unknown"
            }
          >
            <div
              className={`inline-flex ml-1 select-none px-1 py-0.5 border rounded-md text-xs`}
            >
              UTC
            </div>
          </Row>
          <Row
            name={`Registrant Organization`}
            value={result.registrantOrganization}
            hidden={
              !result.registrantOrganization ||
              result.registrantOrganization === "Unknown"
            }
          />
          <Row
            name={`Registrant Province`}
            value={result.registrantProvince}
            hidden={
              !result.registrantProvince ||
              result.registrantProvince === "Unknown"
            }
          />
          <Row
            name={`Registrant Country`}
            value={result.registrantCountry}
            hidden={
              !result.registrantCountry ||
              result.registrantCountry === "Unknown"
            }
          />
          <Row
            name={`Registrant Phone`}
            value={result.registrantPhone}
            hidden={
              !result.registrantPhone || result.registrantPhone === "Unknown"
            }
          >
            <div
              className={`inline-flex ml-1 select-none px-1 py-0.5 border rounded-md text-xs`}
            >
              Abuse
            </div>
          </Row>
          <Row
            name={`Registrant Email`}
            value={result.registrantEmail}
            hidden={
              !result.registrantEmail || result.registrantEmail === "Unknown"
            }
          />
          <Row
            name={`Name Servers`}
            value={
              <div className={`flex flex-col`}>
                {result.nameServers.map((ns, index) => (
                  <div
                    key={index}
                    className={`text-secondary text-xs border cursor-pointer rounded-md px-1 py-0.5 mt-0.5 w-fit inline-flex flex-row items-center`}
                    onClick={() => copy(ns)}
                  >
                    <CopyIcon className={`w-2.5 h-2.5 mr-1`} />
                    {ns}
                  </div>
                ))}
              </div>
            }
            hidden={result.nameServers.length === 0}
          />
        </tbody>
      </table>
    )
  );
}

function ResultComp({ data, target }: Props) {
  const copy = useClipboard();
  const save = useSaver();
  const { status, result, error, time } = data;

  return (
    <Card className={`w-full h-fit mt-4`}>
      <CardHeader>
        <CardTitle className={`flex flex-row items-center`}>
          Result
          <div className={`flex-grow`} />
          <Badge
            className={`inline-flex flex-row items-center cursor-pointer mr-1 select-none`}
            onClick={() => copy(target)}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full mr-1",
                status ? "bg-green-500" : "bg-red-500",
              )}
            />
            {target}
          </Badge>
          <Badge variant={`outline`}>{time.toFixed(2)}s</Badge>
        </CardTitle>
        <CardContent className={`w-full p-0`}>
          {!status ? (
            <ErrorArea error={error || ""} />
          ) : (
            <div className={`flex flex-col h-fit w-full mt-2`}>
              <ResultTable result={result} target={target} />

              <div className={`flex flex-row items-center mt-2 mb-1.5`}>
                <p className={`text-sm text-secondary font-medium`}>
                  Raw Whois Response
                </p>
                <div className={`flex-grow`} />
                <Button
                  variant={`outline`}
                  size={`icon-sm`}
                  className={`mr-1`}
                  onClick={() => copy(result?.rawWhoisContent || "")}
                >
                  <CopyIcon className={`w-3 h-3`} />
                </Button>
                <Button
                  variant={`outline`}
                  size={`icon-sm`}
                  onClick={() =>
                    save(
                      `${target.replace(/\./g, "-")}-whois.txt`,
                      result?.rawWhoisContent || "",
                    )
                  }
                >
                  <DownloadIcon className={`w-3 h-3`} />
                </Button>
              </div>
              <TextArea
                rows={10}
                readOnly={true}
                value={result?.rawWhoisContent || ""}
              />
            </div>
          )}
        </CardContent>
      </CardHeader>
    </Card>
  );
}

export default function Lookup({ data, target }: Props) {
  const [inputDomain, setInputDomain] = React.useState<string>(target);
  const [loading, setLoading] = React.useState<boolean>(false);

  const goStage = (target: string) => {
    setLoading(true);
    window.location.href = toSearchURI(inputDomain);
  };

  useEffect(() => {
    addHistory(target);
  }, []);

  return (
    <ScrollArea className={`w-full h-full`}>
      <main
        className={
          "relative w-full min-h-full grid place-items-center px-4 pt-20 pb-6"
        }
      >
        <div
          className={"flex flex-col items-center w-full h-fit max-w-[568px]"}
        >
          <h1
            className={
              "text-lg md:text-2xl lg:text-3xl font-bold flex flex-row items-center select-none"
            }
          >
            <Search
              className={`w-4 h-4 md:w-6 md:h-6 mr-1 md:mr-1.5 shrink-0`}
            />
            Whois Lookup
          </h1>
          <p className={"text-md text-center text-secondary"}>
            Please enter a domain name to lookup
          </p>
          <div className={"relative flex flex-row items-center w-full mt-2"}>
            <Input
              className={`w-full text-center`}
              placeholder={`domain name (e.g. google.com, 8.8.8.8)`}
              value={inputDomain}
              onChange={(e) => setInputDomain(e.target.value)}
              onKeyDown={(e) => {
                if (isEnter(e)) {
                  goStage(inputDomain);
                }
              }}
            />
            <Button
              size={`icon`}
              variant={`outline`}
              className={`absolute right-0 rounded-l-none`}
              onClick={() => goStage(inputDomain)}
            >
              {loading ? (
                <Loader2 className={`w-4 h-4 animate-spin`} />
              ) : (
                <Send className={`w-4 h-4`} />
              )}
            </Button>
          </div>
          <div
            className={`flex items-center flex-row w-full text-xs mt-1.5 select-none text-secondary`}
          >
            <div className={`flex-grow`} />
            <CornerDownRight className={`w-3 h-3 mr-1`} />
            <p className={`px-1 py-0.5 border rounded-md`}>Enter</p>
          </div>
          <ResultComp data={data} target={target} />
        </div>
        <div
          className={`mt-12 text-sm flex flex-row items-center font-medium text-muted-foreground select-none`}
        >
          Powered by{" "}
          <Link
            href={`https://github.com/zmh-program/next-whois-ui`}
            target={`_blank`}
            className={`text-primary underline underline-offset-2 mx-1`}
          >
            Next Whois UI
          </Link>
          <Badge variant={`outline`}>v{VERSION}</Badge>
        </div>
      </main>
    </ScrollArea>
  );
}
