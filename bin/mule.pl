#!/usr/bin/env perl

use v5.10;

use autodie;
use strict;
use warnings;

use LWP::UserAgent;
use Data::Dumper;

my $ua = LWP::UserAgent->new;

my $res = $ua->get("https://registry.npmjs.org/uglify-js");

print Dumper($res);

# vim:ts=2:sw=2:sts=2:et:ft=perl

