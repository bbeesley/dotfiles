#!/bin/bash

## function to check we're not on the master branch, deal with it if we are
function branchTest {
if [[ $(cd ~/dotfiles && git status ~/dotfiles | grep 'On branch master') ]]
then 
echo "We're on the master branch, making a new branch for this box"
box=$(hostname -s)
cd ~/dotfiles && git branch $box && git checkout $box
branchTest
else
echo "Great, we're not on the master branch, lets proceed"
fi
}

## function to do the setup, dotfiles present in home will be moved to the repo 
## and symlinked back, dotfiles in the repo but not in home will just be symlinked
function setup {
for i in $(ls ~/dotfiles | grep '^_'); do 
dotname=$(echo $i | sed 's|^_|.|')
if [[ ~/$dotname ]]
then
echo "You already have a $dotname in your home folder, I'll move it to the dotfiles directory and symlink it back"
mv ~/$dotname ~/dotfiles/$i && ln -s ~/dotfiles/$i ~/$dotname
else 
echo "You don't seem to have a $dotname in your home folder, linking the one from the dotfiles directory"
ln -s ~/dotfiles/$i ~/$dotname
fi
done
for i in $(ls ~/dotfiles | grep '^_'); do 
dotname=$(echo $i | sed 's|^_|.|')
if [[ ~/$dotname ]]
then
echo "You already have a $dotname in your home folder, I'll move it to the dotfiles directory and symlink it back"
mv ~/$dotname ~/dotfiles/$i && ln -s ~/dotfiles/$i ~/$dotname
else 
echo "You don't seem to have a $dotname in your home folder, linking the one from the dotfiles directory"
ln -s ~/dotfiles/$i ~/$dotname
fi
done

for i in $(find ~/dotfiles/ -maxdepth 2 -mindepth 2 -type d | grep -v '\.git'); do
dotdir=$(dirname $i | grep -o '[^/]*$')
sub=$(basename $i)
if [[ ~/.$dotdir ]]
then
echo "OK, .$dotdir exists in your home dir"
if [[ ~/.$dotdir/$sub ]]
then
echo "OK, you already have a local version of.$dotdir/$sub, moving it to dotfiles repo and symlinking"
mv ~/.$dotdir/$sub ~/dotfiles/$dotdir/$sub && ln -s ~/dotfiles/$dotdir/$sub ~/.$dotdir/$sub
else
echo "No $sub in your .$dotdir, symlinking the version from the dotfiles repo"
ln -s ~/dotfiles/$dotdir/$sub ~/.$dotdir/$sub
fi
else
echo "You dont have .$dotdir in your home, making it and symlinking $sub from the dotfiles repo"
mkdir ~/.$dotdir && ln -s ~/dotfiles/$dotdir/$sub ~/.$dotdir/$sub
fi
done
}

## Do the branch test
branchTest

## Do the setup
setup

## Quit
exit